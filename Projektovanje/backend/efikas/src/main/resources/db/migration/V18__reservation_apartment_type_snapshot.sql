ALTER TABLE efikas.reservation
    ADD COLUMN "ApartmentTypeSnapshotId" integer;

UPDATE efikas.reservation reservation
SET "ApartmentTypeSnapshotId" = apartment."ApartmentTypeId"
FROM efikas.apartment apartment
WHERE apartment."ApartmentId" = reservation."ApartmentId";

ALTER TABLE efikas.reservation
    ALTER COLUMN "ApartmentTypeSnapshotId" SET NOT NULL,
    ADD CONSTRAINT fk_reservation_apartment_type_snapshot
        FOREIGN KEY ("ApartmentTypeSnapshotId")
        REFERENCES efikas.apartment_type ("ApartmentTypeId") ON DELETE RESTRICT;

CREATE INDEX idx_reservation_apartment_type_snapshot
    ON efikas.reservation ("ApartmentTypeSnapshotId", "CheckInDate");

CREATE OR REPLACE FUNCTION efikas.guard_reservation_type_snapshot()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_type_id integer;
BEGIN
    SELECT "ApartmentTypeId" INTO current_type_id
    FROM efikas.apartment WHERE "ApartmentId" = NEW."ApartmentId";
    IF NEW."ApartmentTypeSnapshotId" IS DISTINCT FROM current_type_id THEN
        RAISE EXCEPTION 'Reservation apartment type snapshot must match the apartment type at creation.'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_reservation_type_snapshot_insert
BEFORE INSERT ON efikas.reservation
FOR EACH ROW EXECUTE FUNCTION efikas.guard_reservation_type_snapshot();

CREATE OR REPLACE FUNCTION efikas.reject_reservation_type_snapshot_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW."ApartmentTypeSnapshotId" <> OLD."ApartmentTypeSnapshotId" THEN
        RAISE EXCEPTION 'Reservation apartment type snapshot is immutable.' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_reservation_type_snapshot_immutable
BEFORE UPDATE OF "ApartmentTypeSnapshotId" ON efikas.reservation
FOR EACH ROW EXECUTE FUNCTION efikas.reject_reservation_type_snapshot_update();
