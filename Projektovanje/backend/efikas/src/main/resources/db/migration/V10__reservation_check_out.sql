ALTER TABLE efikas.reservation
    ADD COLUMN "CheckedOutBy" integer,
    ADD COLUMN "CheckedOutAt" timestamptz,
    ADD CONSTRAINT fk_reservation_checked_out_by FOREIGN KEY ("CheckedOutBy")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    ADD CONSTRAINT reservation_checked_out_pair CHECK (
        ("CheckedOutBy" IS NULL AND "CheckedOutAt" IS NULL)
        OR ("CheckedOutBy" IS NOT NULL AND "CheckedOutAt" IS NOT NULL)
    ),
    ADD CONSTRAINT reservation_checkout_after_checkin CHECK (
        "CheckedOutAt" IS NULL OR "CheckedInAt" IS NULL OR "CheckedOutAt" >= "CheckedInAt"
    );

CREATE OR REPLACE FUNCTION efikas.guard_checkout_task_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE reservation_status varchar(32); actor_role varchar(32);
BEGIN
    IF NEW."Source" <> 'CHECKOUT' THEN RETURN NEW; END IF;
    SELECT "Status" INTO reservation_status FROM efikas.reservation
    WHERE "ReservationId" = NEW."ReservationId" FOR UPDATE;
    SELECT "Role" INTO actor_role FROM efikas.app_user WHERE "UserId" = NEW."CreatedBy";
    IF reservation_status <> 'CHECKED_IN' THEN
        RAISE EXCEPTION 'A checkout cleaning task requires an active checked-in reservation.' USING ERRCODE='23514';
    END IF;
    IF actor_role <> 'AGENT' THEN
        RAISE EXCEPTION 'A checkout cleaning task must be created by an agent.' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_guard_checkout_task_insert
BEFORE INSERT ON efikas.operational_task
FOR EACH ROW EXECUTE FUNCTION efikas.guard_checkout_task_insert();

CREATE OR REPLACE FUNCTION efikas.guard_reservation_check_out()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW."Status" = 'CHECKED_OUT' AND OLD."Status" <> 'CHECKED_OUT' THEN
        IF OLD."Status" <> 'CHECKED_IN' OR NEW."CheckedOutBy" IS NULL OR NEW."CheckedOutAt" IS NULL THEN
            RAISE EXCEPTION 'Check-out requires an active stay and executor metadata.' USING ERRCODE='23514';
        END IF;
        IF (SELECT "OperationalStatus" FROM efikas.apartment WHERE "ApartmentId"=NEW."ApartmentId") <> 'DIRTY' THEN
            RAISE EXCEPTION 'Check-out must leave the apartment DIRTY.' USING ERRCODE='23514';
        END IF;
        IF (SELECT COUNT(*) FROM efikas.operational_task task
            WHERE task."ReservationId"=NEW."ReservationId" AND task."Source"='CHECKOUT'
              AND task."Status"='NEW' AND task."CreatedBy"=NEW."CheckedOutBy") <> 1 THEN
            RAISE EXCEPTION 'Check-out requires exactly one NEW cleaning task created by its agent.' USING ERRCODE='23514';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM efikas.reservation_status_history history
            WHERE history."ReservationId"=NEW."ReservationId" AND history."Status"='CHECKED_OUT'
              AND history."ChangedBy"=NEW."CheckedOutBy") THEN
            RAISE EXCEPTION 'Check-out requires reservation status history.' USING ERRCODE='23514';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM efikas.apartment_status_history history
            WHERE history."ApartmentId"=NEW."ApartmentId" AND history."Status"='DIRTY'
              AND history."ChangedBy"=NEW."CheckedOutBy") THEN
            RAISE EXCEPTION 'Check-out requires apartment status history.' USING ERRCODE='23514';
        END IF;
    ELSIF OLD."Status" = 'CHECKED_OUT' AND (
            NEW."Status" <> OLD."Status" OR NEW."CheckedOutBy" IS DISTINCT FROM OLD."CheckedOutBy"
            OR NEW."CheckedOutAt" IS DISTINCT FROM OLD."CheckedOutAt") THEN
        RAISE EXCEPTION 'Completed check-out metadata is immutable.' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_guard_reservation_check_out
BEFORE UPDATE OF "Status", "CheckedOutBy", "CheckedOutAt" ON efikas.reservation
FOR EACH ROW EXECUTE FUNCTION efikas.guard_reservation_check_out();
