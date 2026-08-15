CREATE SEQUENCE efikas.demo_receipt_number_seq START WITH 1;

CREATE TABLE efikas.demo_receipt (
    "DemoReceiptId" bigserial PRIMARY KEY,
    "ReservationId" integer NOT NULL,
    "ReceiptNumber" varchar(64) NOT NULL,
    "IssuedAt" timestamptz NOT NULL,
    "IssuedBy" integer NOT NULL,
    "HotelName" varchar(150) NOT NULL,
    "HotelAddress" varchar(250),
    "HotelTaxId" varchar(32),
    "ApartmentName" varchar(100) NOT NULL,
    "PrimaryGuestName" varchar(120) NOT NULL,
    "CheckInDate" date NOT NULL,
    "CheckOutDate" date NOT NULL,
    "Nights" integer NOT NULL,
    "NightlyRate" numeric(12, 2) NOT NULL,
    "TotalAmount" numeric(12, 2) NOT NULL,
    "VatAmount" numeric(12, 2) NOT NULL DEFAULT 0,
    "Currency" varchar(3) NOT NULL DEFAULT 'BAM',
    "PdfContent" bytea NOT NULL,
    "PdfSha256" varchar(64) NOT NULL,
    CONSTRAINT fk_demo_receipt_reservation FOREIGN KEY ("ReservationId")
        REFERENCES efikas.reservation ("ReservationId") ON DELETE RESTRICT,
    CONSTRAINT fk_demo_receipt_issued_by FOREIGN KEY ("IssuedBy")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    CONSTRAINT uq_demo_receipt_reservation UNIQUE ("ReservationId"),
    CONSTRAINT uq_demo_receipt_number UNIQUE ("ReceiptNumber"),
    CONSTRAINT demo_receipt_number_format CHECK ("ReceiptNumber" ~ '^DEMO-[0-9]{4}-[0-9]{6,}$'),
    CONSTRAINT demo_receipt_period_check CHECK (
        "CheckOutDate" > "CheckInDate" AND "Nights" = "CheckOutDate" - "CheckInDate"
    ),
    CONSTRAINT demo_receipt_amount_check CHECK (
        "NightlyRate" >= 0 AND "TotalAmount" = "NightlyRate" * "Nights" AND "VatAmount" = 0
    ),
    CONSTRAINT demo_receipt_currency_check CHECK ("Currency" = 'BAM'),
    CONSTRAINT demo_receipt_pdf_check CHECK (
        octet_length("PdfContent") > 100 AND "PdfSha256" ~ '^[0-9a-f]{64}$'
    )
);

ALTER TABLE efikas.income_book_entry
    ADD CONSTRAINT fk_income_book_entry_demo_receipt FOREIGN KEY ("ReceiptNumber")
        REFERENCES efikas.demo_receipt ("ReceiptNumber") ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION efikas.guard_demo_receipt_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    reservation_status varchar(32);
    reservation_total numeric(12, 2);
    net_paid numeric(12, 2);
    issuer_role varchar(32);
    issuer_active boolean;
BEGIN
    SELECT reservation."Status",
           reservation."NightlyRate" * (reservation."CheckOutDate" - reservation."CheckInDate")
    INTO reservation_status, reservation_total
    FROM efikas.reservation reservation
    WHERE reservation."ReservationId" = NEW."ReservationId"
    FOR UPDATE;

    IF reservation_status <> 'CHECKED_OUT' THEN
        RAISE EXCEPTION 'A demo receipt requires a checked-out reservation.' USING ERRCODE = '23514';
    END IF;

    SELECT COALESCE(SUM(payment."Amount"), 0)
    INTO net_paid
    FROM efikas.payment payment
    WHERE payment."ReservationId" = NEW."ReservationId";

    IF net_paid <> reservation_total OR NEW."TotalAmount" <> reservation_total THEN
        RAISE EXCEPTION 'A demo receipt requires an exactly paid reservation total.' USING ERRCODE = '23514';
    END IF;

    SELECT app_user."Role", app_user."Active"
    INTO issuer_role, issuer_active
    FROM efikas.app_user app_user
    WHERE app_user."UserId" = NEW."IssuedBy";

    IF issuer_role <> 'AGENT' OR NOT issuer_active THEN
        RAISE EXCEPTION 'A demo receipt must be issued by an active agent.' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_demo_receipt_insert
BEFORE INSERT ON efikas.demo_receipt
FOR EACH ROW
EXECUTE FUNCTION efikas.guard_demo_receipt_insert();

CREATE OR REPLACE FUNCTION efikas.reject_demo_receipt_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Demo receipts are immutable.' USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER trg_demo_receipt_immutable
BEFORE UPDATE OR DELETE ON efikas.demo_receipt
FOR EACH ROW
EXECUTE FUNCTION efikas.reject_demo_receipt_mutation();

CREATE OR REPLACE FUNCTION efikas.require_demo_receipt_income_entry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM efikas.income_book_entry entry
        WHERE entry."ReceiptNumber" = NEW."ReceiptNumber"
          AND entry."ReservationId" = NEW."ReservationId"
    ) THEN
        RAISE EXCEPTION 'A demo receipt requires its income-book entry.' USING ERRCODE = '23514';
    END IF;
    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_demo_receipt_requires_income
AFTER INSERT ON efikas.demo_receipt
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION efikas.require_demo_receipt_income_entry();

CREATE OR REPLACE FUNCTION efikas.guard_payment_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    reservation_status varchar(32);
    total_due numeric(12, 2);
    net_before numeric(12, 2);
    net_after numeric(12, 2);
    target_type varchar(24);
    target_reservation_id integer;
    target_effective numeric(12, 2);
BEGIN
    IF EXISTS (SELECT 1 FROM efikas.demo_receipt receipt
               WHERE receipt."ReservationId" = NEW."ReservationId") THEN
        RAISE EXCEPTION 'Payments cannot change after a demo receipt is issued.' USING ERRCODE = '23514';
    END IF;

    SELECT reservation."Status",
           reservation."NightlyRate" * (reservation."CheckOutDate" - reservation."CheckInDate")
    INTO reservation_status, total_due
    FROM efikas.reservation reservation
    WHERE reservation."ReservationId" = NEW."ReservationId"
    FOR UPDATE;

    IF reservation_status IS NULL THEN
        RAISE EXCEPTION 'Reservation not found for payment.' USING ERRCODE = '23503';
    END IF;

    IF NEW."Type" = 'PAYMENT' THEN
        IF NEW."Amount" <= 0 OR NEW."ReferencedPaymentId" IS NOT NULL THEN
            RAISE EXCEPTION 'A payment must be positive and cannot reference another entry.' USING ERRCODE = '23514';
        END IF;
        IF reservation_status IN ('CANCELLED', 'NO_SHOW') THEN
            RAISE EXCEPTION 'A cancelled or no-show reservation cannot receive a new payment.' USING ERRCODE = '23514';
        END IF;
    ELSE
        SELECT target."Type", target."ReservationId",
               target."Amount" + COALESCE((SELECT SUM(correction."Amount")
                   FROM efikas.payment correction
                   WHERE correction."Type" = 'CORRECTION'
                     AND correction."ReferencedPaymentId" = target."PaymentId"), 0)
        INTO target_type, target_reservation_id, target_effective
        FROM efikas.payment target
        WHERE target."PaymentId" = NEW."ReferencedPaymentId";

        IF target_type IS NULL OR target_type <> 'PAYMENT' OR target_reservation_id <> NEW."ReservationId" THEN
            RAISE EXCEPTION 'Corrections and reversals must reference an original payment of this reservation.'
                USING ERRCODE = '23514';
        END IF;
        IF EXISTS (SELECT 1 FROM efikas.payment reversal
                   WHERE reversal."Type" = 'REVERSAL'
                     AND reversal."ReferencedPaymentId" = NEW."ReferencedPaymentId") THEN
            RAISE EXCEPTION 'A reversed payment cannot be changed again.' USING ERRCODE = '23514';
        END IF;

        IF NEW."Type" = 'CORRECTION' THEN
            IF target_effective + NEW."Amount" < 0 THEN
                RAISE EXCEPTION 'A correction cannot make the referenced payment negative.' USING ERRCODE = '23514';
            END IF;
        ELSIF NEW."Type" = 'REVERSAL' THEN
            IF target_effective <= 0 OR NEW."Amount" <> -target_effective THEN
                RAISE EXCEPTION 'A reversal must exactly negate the remaining payment effect.' USING ERRCODE = '23514';
            END IF;
        ELSE
            RAISE EXCEPTION 'Unsupported payment entry type.' USING ERRCODE = '23514';
        END IF;
    END IF;

    SELECT COALESCE(SUM(payment."Amount"), 0)
    INTO net_before FROM efikas.payment payment
    WHERE payment."ReservationId" = NEW."ReservationId";

    net_after := net_before + NEW."Amount";
    IF net_after < 0 THEN
        RAISE EXCEPTION 'Net payments cannot be negative.' USING ERRCODE = '23514';
    END IF;
    IF net_after > total_due THEN
        RAISE EXCEPTION 'Net payments cannot exceed the reservation total.' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
