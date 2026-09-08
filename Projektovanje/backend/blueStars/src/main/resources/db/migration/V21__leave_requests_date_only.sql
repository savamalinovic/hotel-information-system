ALTER TABLE efikas.leave_request DROP CONSTRAINT leave_request_period_check;

ALTER TABLE efikas.leave_request RENAME COLUMN "StartsAt" TO "StartDate";
ALTER TABLE efikas.leave_request RENAME COLUMN "EndsAt" TO "EndDate";
ALTER TABLE efikas.leave_request
    ALTER COLUMN "StartDate" TYPE date USING ("StartDate" AT TIME ZONE 'Europe/Sarajevo')::date,
    ALTER COLUMN "EndDate" TYPE date USING ("EndDate" AT TIME ZONE 'Europe/Sarajevo')::date;
ALTER TABLE efikas.leave_request
    ADD CONSTRAINT leave_request_period_check CHECK ("EndDate" >= "StartDate");

CREATE OR REPLACE FUNCTION efikas.guard_leave_request_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE worker_role varchar(32); worker_active boolean;
BEGIN
    SELECT "Role", "Active" INTO worker_role, worker_active FROM efikas.app_user
    WHERE "UserId" = NEW."WorkerId" FOR UPDATE;
    IF worker_role IS NULL THEN RAISE EXCEPTION 'Worker not found.' USING ERRCODE = '23503'; END IF;
    IF worker_role NOT IN ('AGENT', 'OPERATIONAL_WORKER') OR NOT worker_active
        OR NEW."Status" <> 'PENDING' OR NEW."DecidedBy" IS NOT NULL OR NEW."DecidedAt" IS NOT NULL
        OR NEW."DecisionReason" IS NOT NULL OR NEW."CancelledBy" IS NOT NULL OR NEW."CancelledAt" IS NOT NULL THEN
        RAISE EXCEPTION 'Only a pending self leave request can be created.' USING ERRCODE = '23514';
    END IF;
    IF NEW."EndDate" < (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Sarajevo')::date THEN
        RAISE EXCEPTION 'Leave end date must not be in the past.' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (SELECT 1 FROM efikas.leave_request request WHERE request."WorkerId" = NEW."WorkerId"
        AND request."Status" IN ('PENDING', 'APPROVED')
        AND request."StartDate" <= NEW."EndDate" AND request."EndDate" >= NEW."StartDate") THEN
        RAISE EXCEPTION 'Worker already has an overlapping active leave request.' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION efikas.guard_leave_request_update()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor_role varchar(32); actor_active boolean; worker_role varchar(32); worker_active boolean;
BEGIN
    IF NEW."WorkerId" <> OLD."WorkerId" OR NEW."StartDate" <> OLD."StartDate"
        OR NEW."EndDate" <> OLD."EndDate" OR NEW."Reason" <> OLD."Reason" OR NEW."CreatedAt" <> OLD."CreatedAt" THEN
        RAISE EXCEPTION 'Leave request facts are immutable.' USING ERRCODE = '23514';
    END IF;
    IF OLD."Status" = 'PENDING' AND NEW."Status" IN ('APPROVED', 'REJECTED') THEN
        SELECT "Role", "Active" INTO worker_role, worker_active FROM efikas.app_user WHERE "UserId" = OLD."WorkerId" FOR UPDATE;
        SELECT "Role", "Active" INTO actor_role, actor_active FROM efikas.app_user WHERE "UserId" = NEW."DecidedBy";
        IF worker_role NOT IN ('AGENT', 'OPERATIONAL_WORKER') OR worker_active IS DISTINCT FROM true
            OR NEW."EndDate" < (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Sarajevo')::date
            OR actor_role IS DISTINCT FROM 'MANAGER' OR actor_active IS DISTINCT FROM true OR NEW."DecidedAt" IS NULL
            OR (NEW."Status" = 'REJECTED' AND (NEW."DecisionReason" IS NULL OR length(btrim(NEW."DecisionReason")) = 0)) THEN
            RAISE EXCEPTION 'A leave decision requires an active manager.' USING ERRCODE = '23514';
        END IF;
    ELSIF OLD."Status" IN ('PENDING', 'APPROVED') AND NEW."Status" = 'CANCELLED' THEN
        IF NEW."CancelledBy" IS DISTINCT FROM OLD."WorkerId" OR NEW."CancelledAt" IS NULL
            OR NEW."EndDate" < (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Sarajevo')::date
            OR NEW."DecidedBy" IS DISTINCT FROM OLD."DecidedBy" OR NEW."DecidedAt" IS DISTINCT FROM OLD."DecidedAt"
            OR NEW."DecisionReason" IS DISTINCT FROM OLD."DecisionReason" THEN
            RAISE EXCEPTION 'Only the worker can cancel their pending or approved leave.' USING ERRCODE = '23514';
        END IF;
    ELSE RAISE EXCEPTION 'Invalid leave request status transition.' USING ERRCODE = '23514'; END IF;
    RETURN NEW;
END; $$;
