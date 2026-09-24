CREATE TABLE efikas.payment (
    "PaymentId" bigserial PRIMARY KEY,
    "ReservationId" integer NOT NULL,
    "Type" varchar(24) NOT NULL,
    "Amount" numeric(12, 2) NOT NULL,
    "ReferencedPaymentId" bigint,
    "Reference" varchar(100),
    "Reason" varchar(300) NOT NULL,
    "RecordedBy" integer NOT NULL,
    "RecordedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_reservation FOREIGN KEY ("ReservationId")
        REFERENCES efikas.reservation ("ReservationId") ON DELETE RESTRICT,
    CONSTRAINT fk_payment_reference FOREIGN KEY ("ReferencedPaymentId")
        REFERENCES efikas.payment ("PaymentId") ON DELETE RESTRICT,
    CONSTRAINT fk_payment_recorded_by FOREIGN KEY ("RecordedBy")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    CONSTRAINT payment_type_check CHECK ("Type" IN ('PAYMENT', 'CORRECTION', 'REVERSAL')),
    CONSTRAINT payment_non_zero_amount_check CHECK ("Amount" <> 0)
);

CREATE INDEX idx_payment_reservation_timeline
    ON efikas.payment ("ReservationId", "RecordedAt" DESC, "PaymentId" DESC);
CREATE INDEX idx_payment_reference
    ON efikas.payment ("ReferencedPaymentId") WHERE "ReferencedPaymentId" IS NOT NULL;
CREATE UNIQUE INDEX uq_payment_reversal
    ON efikas.payment ("ReferencedPaymentId") WHERE "Type" = 'REVERSAL';

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
            RAISE EXCEPTION 'A payment must be positive and cannot reference another entry.'
                USING ERRCODE = '23514';
        END IF;
        IF reservation_status IN ('CANCELLED', 'NO_SHOW') THEN
            RAISE EXCEPTION 'A cancelled or no-show reservation cannot receive a new payment.'
                USING ERRCODE = '23514';
        END IF;
    ELSE
        SELECT target."Type", target."ReservationId",
               target."Amount" + COALESCE((
                   SELECT SUM(correction."Amount")
                   FROM efikas.payment correction
                   WHERE correction."Type" = 'CORRECTION'
                     AND correction."ReferencedPaymentId" = target."PaymentId"
               ), 0)
        INTO target_type, target_reservation_id, target_effective
        FROM efikas.payment target
        WHERE target."PaymentId" = NEW."ReferencedPaymentId";

        IF target_type IS NULL OR target_type <> 'PAYMENT'
                OR target_reservation_id <> NEW."ReservationId" THEN
            RAISE EXCEPTION 'Corrections and reversals must reference an original payment of this reservation.'
                USING ERRCODE = '23514';
        END IF;
        IF EXISTS (
            SELECT 1 FROM efikas.payment reversal
            WHERE reversal."Type" = 'REVERSAL'
              AND reversal."ReferencedPaymentId" = NEW."ReferencedPaymentId"
        ) THEN
            RAISE EXCEPTION 'A reversed payment cannot be changed again.' USING ERRCODE = '23514';
        END IF;

        IF NEW."Type" = 'CORRECTION' THEN
            IF target_effective + NEW."Amount" < 0 THEN
                RAISE EXCEPTION 'A correction cannot make the referenced payment negative.'
                    USING ERRCODE = '23514';
            END IF;
        ELSIF NEW."Type" = 'REVERSAL' THEN
            IF target_effective <= 0 OR NEW."Amount" <> -target_effective THEN
                RAISE EXCEPTION 'A reversal must exactly negate the remaining payment effect.'
                    USING ERRCODE = '23514';
            END IF;
        ELSE
            RAISE EXCEPTION 'Unsupported payment entry type.' USING ERRCODE = '23514';
        END IF;
    END IF;

    SELECT COALESCE(SUM(payment."Amount"), 0)
    INTO net_before
    FROM efikas.payment payment
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

CREATE TRIGGER trg_guard_payment_insert
BEFORE INSERT ON efikas.payment
FOR EACH ROW
EXECUTE FUNCTION efikas.guard_payment_insert();

CREATE OR REPLACE FUNCTION efikas.reject_payment_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Payment ledger entries are immutable.' USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER trg_payment_immutable
BEFORE UPDATE OR DELETE ON efikas.payment
FOR EACH ROW
EXECUTE FUNCTION efikas.reject_payment_mutation();

CREATE OR REPLACE FUNCTION efikas.guard_reservation_total_against_payments()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    net_paid numeric(12, 2);
    new_total numeric(12, 2);
BEGIN
    IF NEW."CheckInDate" = OLD."CheckInDate"
            AND NEW."CheckOutDate" = OLD."CheckOutDate"
            AND NEW."NightlyRate" = OLD."NightlyRate" THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(SUM(payment."Amount"), 0)
    INTO net_paid
    FROM efikas.payment payment
    WHERE payment."ReservationId" = NEW."ReservationId";

    new_total := NEW."NightlyRate" * (NEW."CheckOutDate" - NEW."CheckInDate");
    IF net_paid > new_total THEN
        RAISE EXCEPTION 'Reservation total cannot be reduced below net payments.' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reservation_total_not_below_payments
BEFORE UPDATE OF "CheckInDate", "CheckOutDate", "NightlyRate" ON efikas.reservation
FOR EACH ROW
EXECUTE FUNCTION efikas.guard_reservation_total_against_payments();
