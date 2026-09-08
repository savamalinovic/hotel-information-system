CREATE TABLE efikas.guest (
    "GuestId" serial PRIMARY KEY,
    "CitizenId" varchar(30) NOT NULL UNIQUE,
    "IsLocal" boolean NOT NULL,
    "PersonalDocumentURL" varchar(500),
    "Name" varchar(50) NOT NULL,
    "Surname" varchar(50) NOT NULL,
    "Gender" person_gender NOT NULL,
    "PhoneNumber" varchar(30),
    "BirthDate" date NOT NULL,
    "BirthPlace" varchar(50) NOT NULL,
    "BirthMunicipality" varchar(50),
    "BirthCountry" varchar(50) NOT NULL,
    "Address" varchar(100) NOT NULL,
    "Citizenship" varchar(50),
    "PassportNumber" varchar(30),
    "PassportIssuedDate" date,
    "VisaType" varchar(30),
    "VisaNumber" varchar(30),
    "PermittedResidenceDate" date,
    "EntryDate" date,
    "EntryPlace" varchar(50),
    "Version" bigint NOT NULL DEFAULT 0,
    "CreatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO efikas.guest (
    "GuestId", "CitizenId", "IsLocal", "PersonalDocumentURL", "Name", "Surname", "Gender",
    "PhoneNumber", "BirthDate", "BirthPlace", "BirthMunicipality", "BirthCountry", "Address",
    "Citizenship", "PassportNumber", "PassportIssuedDate", "VisaType", "VisaNumber",
    "PermittedResidenceDate", "EntryDate", "EntryPlace", "CreatedAt", "UpdatedAt"
)
SELECT
    "GuestsBookId", "CitizenId", "IsLocal", "PersonalDocumentURL", "Name", "Surname", "Gender",
    "PhoneNumber", "BirthDate", "BirthPlace", "BirthMunicipality", "BirthCountry", "Address",
    "Citizenship", "PassportNumber", "PassportIssuedDate", "VisaType", "VisaNumber",
    "PermittedResidenceDate", "EntryDate", "EntryPlace", COALESCE("CreatedAt", CURRENT_TIMESTAMP),
    COALESCE("CreatedAt", CURRENT_TIMESTAMP)
FROM efikas.guests_book;

SELECT setval(
    pg_get_serial_sequence('efikas.guest', 'GuestId'),
    COALESCE((SELECT MAX("GuestId") FROM efikas.guest), 1),
    EXISTS (SELECT 1 FROM efikas.guest)
);

CREATE INDEX idx_guest_name ON efikas.guest (lower("Surname"), lower("Name"));
CREATE INDEX idx_guest_passport ON efikas.guest ("PassportNumber") WHERE "PassportNumber" IS NOT NULL;

CREATE TABLE efikas.reservation_guest (
    "ReservationGuestId" bigserial PRIMARY KEY,
    "ReservationId" integer NOT NULL,
    "GuestId" integer NOT NULL,
    "PrimaryGuest" boolean NOT NULL DEFAULT false,
    "AddedBy" integer NOT NULL,
    "CreatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reservation_guest_reservation FOREIGN KEY ("ReservationId")
        REFERENCES efikas.reservation ("ReservationId") ON DELETE RESTRICT,
    CONSTRAINT fk_reservation_guest_guest FOREIGN KEY ("GuestId")
        REFERENCES efikas.guest ("GuestId") ON DELETE RESTRICT,
    CONSTRAINT fk_reservation_guest_added_by FOREIGN KEY ("AddedBy")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    CONSTRAINT uq_reservation_guest UNIQUE ("ReservationId", "GuestId")
);

CREATE UNIQUE INDEX uq_reservation_primary_guest
    ON efikas.reservation_guest ("ReservationId") WHERE "PrimaryGuest";
CREATE INDEX idx_reservation_guest_guest ON efikas.reservation_guest ("GuestId");

INSERT INTO efikas.reservation_guest ("ReservationId", "GuestId", "PrimaryGuest", "AddedBy", "CreatedAt")
SELECT reservation."ReservationId", reservation."GuestId", true, reservation."CreatedBy", reservation."CreatedAt"
FROM efikas.reservation reservation
WHERE reservation."GuestId" IS NOT NULL;

ALTER TABLE efikas.reservation
    ADD COLUMN "CheckInClaimedBy" integer,
    ADD COLUMN "CheckInClaimedAt" timestamptz,
    ADD COLUMN "CheckedInBy" integer,
    ADD COLUMN "CheckedInAt" timestamptz,
    ADD CONSTRAINT fk_reservation_check_in_claimed_by FOREIGN KEY ("CheckInClaimedBy")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    ADD CONSTRAINT fk_reservation_checked_in_by FOREIGN KEY ("CheckedInBy")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    ADD CONSTRAINT reservation_check_in_claim_pair CHECK (
        ("CheckInClaimedBy" IS NULL AND "CheckInClaimedAt" IS NULL)
        OR ("CheckInClaimedBy" IS NOT NULL AND "CheckInClaimedAt" IS NOT NULL)
    ),
    ADD CONSTRAINT reservation_checked_in_pair CHECK (
        ("CheckedInBy" IS NULL AND "CheckedInAt" IS NULL)
        OR ("CheckedInBy" IS NOT NULL AND "CheckedInAt" IS NOT NULL)
    );

CREATE TABLE efikas.reservation_check_in_claim_history (
    "ReservationCheckInClaimHistoryId" bigserial PRIMARY KEY,
    "ReservationId" integer NOT NULL,
    "Action" varchar(32) NOT NULL,
    "PreviousClaimedBy" integer,
    "ClaimedBy" integer,
    "PerformedBy" integer NOT NULL,
    "PerformedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_check_in_claim_history_reservation FOREIGN KEY ("ReservationId")
        REFERENCES efikas.reservation ("ReservationId") ON DELETE RESTRICT,
    CONSTRAINT fk_check_in_claim_history_previous_user FOREIGN KEY ("PreviousClaimedBy")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    CONSTRAINT fk_check_in_claim_history_claimed_user FOREIGN KEY ("ClaimedBy")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    CONSTRAINT fk_check_in_claim_history_performed_user FOREIGN KEY ("PerformedBy")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    CONSTRAINT check_in_claim_history_action_check
        CHECK ("Action" IN ('CLAIMED', 'RELEASED', 'TAKEN_OVER'))
);

CREATE INDEX idx_check_in_claim_history_timeline
    ON efikas.reservation_check_in_claim_history
        ("ReservationId", "PerformedAt" DESC, "ReservationCheckInClaimHistoryId" DESC);

CREATE TABLE efikas.guest_book_entry (
    "GuestBookEntryId" bigserial PRIMARY KEY,
    "ReservationId" integer NOT NULL,
    "GuestId" integer NOT NULL,
    "BookType" varchar(16) NOT NULL,
    "CitizenId" varchar(30) NOT NULL,
    "PersonalDocumentURL" varchar(500),
    "Name" varchar(50) NOT NULL,
    "Surname" varchar(50) NOT NULL,
    "Gender" person_gender NOT NULL,
    "PhoneNumber" varchar(30),
    "BirthDate" date NOT NULL,
    "BirthPlace" varchar(50) NOT NULL,
    "BirthMunicipality" varchar(50),
    "BirthCountry" varchar(50) NOT NULL,
    "Address" varchar(100) NOT NULL,
    "Citizenship" varchar(50),
    "PassportNumber" varchar(30),
    "PassportIssuedDate" date,
    "VisaType" varchar(30),
    "VisaNumber" varchar(30),
    "PermittedResidenceDate" date,
    "EntryDate" date,
    "EntryPlace" varchar(50),
    "ApartmentId" integer NOT NULL,
    "ApartmentName" varchar(50) NOT NULL,
    "ApartmentFloor" integer,
    "ArrivedAt" timestamptz NOT NULL,
    "PlannedDepartureDate" date NOT NULL,
    "CheckedInBy" integer NOT NULL,
    "CreatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_guest_book_entry_reservation_guest FOREIGN KEY ("ReservationId", "GuestId")
        REFERENCES efikas.reservation_guest ("ReservationId", "GuestId") ON DELETE RESTRICT,
    CONSTRAINT fk_guest_book_entry_apartment FOREIGN KEY ("ApartmentId")
        REFERENCES efikas.apartment ("ApartmentId") ON DELETE RESTRICT,
    CONSTRAINT fk_guest_book_entry_checked_in_by FOREIGN KEY ("CheckedInBy")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    CONSTRAINT guest_book_entry_book_type_check CHECK ("BookType" IN ('DOMESTIC', 'FOREIGN')),
    CONSTRAINT uq_guest_book_entry_reservation_guest UNIQUE ("ReservationId", "GuestId")
);

CREATE INDEX idx_guest_book_entry_book_timeline
    ON efikas.guest_book_entry ("BookType", "ArrivedAt" DESC);

CREATE OR REPLACE FUNCTION efikas.reject_guest_book_entry_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Guest book entries are immutable.' USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER trg_guest_book_entry_immutable
BEFORE UPDATE OR DELETE ON efikas.guest_book_entry
FOR EACH ROW
EXECUTE FUNCTION efikas.reject_guest_book_entry_mutation();

CREATE OR REPLACE FUNCTION efikas.guard_reservation_check_in()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."Status" = 'CHECKED_IN' AND OLD."Status" <> 'CHECKED_IN' THEN
        IF NEW."CheckedInBy" IS NULL OR NEW."CheckedInAt" IS NULL THEN
            RAISE EXCEPTION 'A checked-in reservation requires executor metadata.' USING ERRCODE = '23514';
        END IF;

        IF (SELECT COUNT(*) FROM efikas.reservation_guest link
            WHERE link."ReservationId" = NEW."ReservationId") <> NEW."GuestQuantity"
           OR (SELECT COUNT(*) FROM efikas.reservation_guest link
               WHERE link."ReservationId" = NEW."ReservationId" AND link."PrimaryGuest") <> 1 THEN
            RAISE EXCEPTION 'A checked-in reservation requires all guests and exactly one primary guest.'
                USING ERRCODE = '23514';
        END IF;

        IF (SELECT COUNT(*) FROM efikas.guest_book_entry entry
            WHERE entry."ReservationId" = NEW."ReservationId") <> NEW."GuestQuantity" THEN
            RAISE EXCEPTION 'A checked-in reservation requires one guest-book entry per guest.'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_reservation_check_in
BEFORE UPDATE OF "Status", "CheckedInBy", "CheckedInAt" ON efikas.reservation
FOR EACH ROW
EXECUTE FUNCTION efikas.guard_reservation_check_in();
