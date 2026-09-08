ALTER TABLE efikas.reservation
    ADD COLUMN "CheckInDate" date,
    ADD COLUMN "CheckOutDate" date,
    ADD COLUMN "NightlyRate" numeric(12, 2),
    ADD COLUMN "Status" varchar(32) NOT NULL DEFAULT 'CONFIRMED',
    ADD COLUMN "CreatedBy" integer,
    ADD COLUMN "Version" bigint NOT NULL DEFAULT 0,
    ADD COLUMN "CreatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "UpdatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN "GuestId" DROP NOT NULL,
    ALTER COLUMN "TypeId" DROP NOT NULL,
    ALTER COLUMN "Price" DROP NOT NULL;

UPDATE efikas.reservation reservation
SET
    "GuestQuantity" = GREATEST(COALESCE(reservation."GuestQuantity", 1), 1),
    "CheckInDate" = guest."DateTimeOfArrival"::date,
    "CheckOutDate" = CASE
        WHEN guest."DateTimeOfDeparture"::date > guest."DateTimeOfArrival"::date
            THEN guest."DateTimeOfDeparture"::date
        ELSE guest."DateTimeOfArrival"::date + 1
    END,
    "NightlyRate" = CASE
        WHEN reservation."Price" BETWEEN 0 AND 9999999999.99
            THEN reservation."Price"::numeric(12, 2)
        ELSE apartment_type."DefaultNightlyRate"
    END,
    "CreatedBy" = apartment."UserId"
FROM efikas.guests_book guest,
     efikas.apartment apartment,
     efikas.apartment_type apartment_type
WHERE reservation."GuestId" = guest."GuestsBookId"
  AND reservation."ApartmentId" = apartment."ApartmentId"
  AND apartment."ApartmentTypeId" = apartment_type."ApartmentTypeId";

ALTER TABLE efikas.reservation
    ALTER COLUMN "CheckInDate" SET NOT NULL,
    ALTER COLUMN "CheckOutDate" SET NOT NULL,
    ALTER COLUMN "NightlyRate" SET NOT NULL,
    ALTER COLUMN "CreatedBy" SET NOT NULL,
    ADD CONSTRAINT fk_reservation_created_by FOREIGN KEY ("CreatedBy")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    ADD CONSTRAINT reservation_guest_quantity_check CHECK ("GuestQuantity" > 0),
    ADD CONSTRAINT reservation_period_check CHECK ("CheckInDate" < "CheckOutDate"),
    ADD CONSTRAINT reservation_nightly_rate_check CHECK ("NightlyRate" >= 0),
    ADD CONSTRAINT reservation_status_check
        CHECK ("Status" IN ('CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW'));

UPDATE efikas.reservation reservation
SET "Status" = 'CANCELLED'
WHERE EXISTS (
    SELECT 1
    FROM efikas.reservation earlier
    WHERE earlier."ApartmentId" = reservation."ApartmentId"
      AND earlier."ReservationId" < reservation."ReservationId"
      AND earlier."CheckInDate" < reservation."CheckOutDate"
      AND earlier."CheckOutDate" > reservation."CheckInDate"
)
OR EXISTS (
    SELECT 1
    FROM efikas.apartment_unavailability period
    WHERE period."ApartmentId" = reservation."ApartmentId"
      AND period."StartDate" < reservation."CheckOutDate"
      AND period."EndDate" >= reservation."CheckInDate"
);

CREATE INDEX idx_reservation_apartment_period
    ON efikas.reservation ("ApartmentId", "CheckInDate", "CheckOutDate");
CREATE INDEX idx_reservation_status_period
    ON efikas.reservation ("Status", "CheckInDate", "CheckOutDate");

CREATE TABLE efikas.reservation_status_history (
    "ReservationStatusHistoryId" bigserial PRIMARY KEY,
    "ReservationId" integer NOT NULL,
    "Status" varchar(32) NOT NULL,
    "ChangedBy" integer,
    "Reason" varchar(300) NOT NULL,
    "ChangedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reservation_status_history_reservation FOREIGN KEY ("ReservationId")
        REFERENCES efikas.reservation ("ReservationId") ON DELETE RESTRICT,
    CONSTRAINT fk_reservation_status_history_user FOREIGN KEY ("ChangedBy")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    CONSTRAINT reservation_status_history_status_check
        CHECK ("Status" IN ('CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW'))
);

INSERT INTO efikas.reservation_status_history (
    "ReservationId", "Status", "ChangedBy", "Reason", "ChangedAt"
)
SELECT
    "ReservationId",
    "Status",
    "CreatedBy",
    CASE WHEN "Status" = 'CANCELLED'
        THEN 'Legacy reservation cancelled during migration because its stay was not uniquely available.'
        ELSE 'Initial status recorded during B03 migration.'
    END,
    "CreatedAt"
FROM efikas.reservation;

CREATE INDEX idx_reservation_status_history_timeline
    ON efikas.reservation_status_history
        ("ReservationId", "ChangedAt" DESC, "ReservationStatusHistoryId" DESC);

CREATE OR REPLACE FUNCTION efikas.guard_reservation_availability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(903, NEW."ApartmentId");

    IF TG_OP = 'UPDATE' AND NEW."ApartmentId" <> OLD."ApartmentId" THEN
        RAISE EXCEPTION 'A reservation apartment cannot be changed.' USING ERRCODE = '23514';
    END IF;

    IF NEW."Status" IN ('CONFIRMED', 'CHECKED_IN') THEN
        IF EXISTS (
            SELECT 1
            FROM efikas.reservation existing
            WHERE existing."ApartmentId" = NEW."ApartmentId"
              AND existing."ReservationId" <> COALESCE(NEW."ReservationId", -1)
              AND existing."Status" IN ('CONFIRMED', 'CHECKED_IN')
              AND existing."CheckInDate" < NEW."CheckOutDate"
              AND existing."CheckOutDate" > NEW."CheckInDate"
        ) THEN
            RAISE EXCEPTION 'The apartment already has a blocking reservation for this period.'
                USING ERRCODE = '23P01';
        END IF;

        IF EXISTS (
            SELECT 1
            FROM efikas.apartment_unavailability period
            WHERE period."ApartmentId" = NEW."ApartmentId"
              AND period."StartDate" < NEW."CheckOutDate"
              AND period."EndDate" >= NEW."CheckInDate"
        ) THEN
            RAISE EXCEPTION 'The apartment is out of order during this period.'
                USING ERRCODE = '23P01';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_reservation_availability
BEFORE INSERT OR UPDATE OF "ApartmentId", "CheckInDate", "CheckOutDate", "Status"
ON efikas.reservation
FOR EACH ROW
EXECUTE FUNCTION efikas.guard_reservation_availability();

CREATE OR REPLACE FUNCTION efikas.guard_apartment_unavailability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(903, NEW."ApartmentId");

    IF EXISTS (
        SELECT 1
        FROM efikas.apartment_unavailability existing
        WHERE existing."ApartmentId" = NEW."ApartmentId"
          AND existing."ApartmentUnavailabilityId" <> COALESCE(NEW."ApartmentUnavailabilityId", -1)
          AND existing."StartDate" <= NEW."EndDate"
          AND existing."EndDate" >= NEW."StartDate"
    ) THEN
        RAISE EXCEPTION 'The apartment already has an overlapping unavailability period.'
            USING ERRCODE = '23P01';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM efikas.reservation reservation
        WHERE reservation."ApartmentId" = NEW."ApartmentId"
          AND reservation."Status" IN ('CONFIRMED', 'CHECKED_IN')
          AND reservation."CheckInDate" <= NEW."EndDate"
          AND reservation."CheckOutDate" > NEW."StartDate"
    ) THEN
        RAISE EXCEPTION 'The apartment has a blocking reservation during this period.'
            USING ERRCODE = '23P01';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_apartment_unavailability
BEFORE INSERT OR UPDATE OF "ApartmentId", "StartDate", "EndDate"
ON efikas.apartment_unavailability
FOR EACH ROW
EXECUTE FUNCTION efikas.guard_apartment_unavailability();
