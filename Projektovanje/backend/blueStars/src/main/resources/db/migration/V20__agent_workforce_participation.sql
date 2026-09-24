CREATE OR REPLACE FUNCTION efikas.guard_attendance_session_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    worker_role varchar(32);
    worker_active boolean;
BEGIN
    IF NEW."ClockedOutAt" IS NOT NULL THEN
        RAISE EXCEPTION 'A new attendance session must be open.' USING ERRCODE = '23514';
    END IF;
    SELECT app_user."Role", app_user."Active"
    INTO worker_role, worker_active
    FROM efikas.app_user app_user
    WHERE app_user."UserId" = NEW."WorkerId"
    FOR UPDATE;

    IF worker_role IS NULL THEN
        RAISE EXCEPTION 'Worker not found.' USING ERRCODE = '23503';
    END IF;
    IF worker_role NOT IN ('AGENT', 'OPERATIONAL_WORKER') OR NOT worker_active THEN
        RAISE EXCEPTION 'Only an active workforce participant can clock in.' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (
        SELECT 1 FROM efikas.attendance_session session
        WHERE session."WorkerId" = NEW."WorkerId" AND session."ClockedOutAt" IS NULL
    ) THEN
        RAISE EXCEPTION 'Worker already has an open attendance session.' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION efikas.guard_availability_override_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    worker_role varchar(32);
    worker_active boolean;
BEGIN
    IF NEW."ClearedAt" IS NOT NULL OR NEW."ClearedBy" IS NOT NULL THEN
        RAISE EXCEPTION 'A new availability override cannot already be cleared.' USING ERRCODE = '23514';
    END IF;
    SELECT app_user."Role", app_user."Active"
    INTO worker_role, worker_active
    FROM efikas.app_user app_user
    WHERE app_user."UserId" = NEW."WorkerId"
    FOR UPDATE;

    IF worker_role IS NULL THEN
        RAISE EXCEPTION 'Worker not found.' USING ERRCODE = '23503';
    END IF;
    IF worker_role NOT IN ('AGENT', 'OPERATIONAL_WORKER') OR NOT worker_active
            OR NEW."CreatedBy" <> NEW."WorkerId" THEN
        RAISE EXCEPTION 'Only an active workforce participant can create a self availability override.'
            USING ERRCODE = '23514';
    END IF;
    IF EXISTS (
        SELECT 1 FROM efikas.availability_override override
        WHERE override."WorkerId" = NEW."WorkerId"
          AND override."ClearedAt" IS NULL
          AND override."StartsAt" < COALESCE(NEW."EndsAt", 'infinity'::timestamptz)
          AND COALESCE(override."EndsAt", 'infinity'::timestamptz) > NEW."StartsAt"
    ) THEN
        RAISE EXCEPTION 'Worker already has an overlapping availability override.'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION efikas.guard_worker_lifecycle_with_open_attendance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF (NEW."Role" IS DISTINCT FROM OLD."Role"
            OR (OLD."Active" AND NOT NEW."Active"))
            AND EXISTS (
                SELECT 1 FROM efikas.attendance_session session
                WHERE session."WorkerId" = OLD."UserId" AND session."ClockedOutAt" IS NULL
            ) THEN
        RAISE EXCEPTION 'Open attendance must be closed before deactivation or role change.'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION efikas.guard_leave_request_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    worker_role varchar(32);
    worker_active boolean;
BEGIN
    SELECT app_user."Role", app_user."Active"
    INTO worker_role, worker_active
    FROM efikas.app_user app_user
    WHERE app_user."UserId" = NEW."WorkerId"
    FOR UPDATE;

    IF worker_role IS NULL THEN
        RAISE EXCEPTION 'Worker not found.' USING ERRCODE = '23503';
    END IF;
    IF worker_role NOT IN ('AGENT', 'OPERATIONAL_WORKER') OR NOT worker_active
            OR NEW."Status" <> 'PENDING'
            OR NEW."DecidedBy" IS NOT NULL OR NEW."DecidedAt" IS NOT NULL
            OR NEW."DecisionReason" IS NOT NULL OR NEW."CancelledBy" IS NOT NULL
            OR NEW."CancelledAt" IS NOT NULL THEN
        RAISE EXCEPTION 'Only a pending self leave request can be created.' USING ERRCODE = '23514';
    END IF;
    IF NEW."EndsAt" <= CURRENT_TIMESTAMP THEN
        RAISE EXCEPTION 'Leave end must be in the future.' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (
        SELECT 1 FROM efikas.leave_request request
        WHERE request."WorkerId" = NEW."WorkerId"
          AND request."Status" IN ('PENDING', 'APPROVED')
          AND request."StartsAt" < NEW."EndsAt" AND request."EndsAt" > NEW."StartsAt"
    ) THEN
        RAISE EXCEPTION 'Worker already has an overlapping active leave request.' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION efikas.guard_leave_request_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    actor_role varchar(32);
    actor_active boolean;
    worker_role varchar(32);
    worker_active boolean;
BEGIN
    IF NEW."WorkerId" <> OLD."WorkerId" OR NEW."StartsAt" <> OLD."StartsAt"
            OR NEW."EndsAt" <> OLD."EndsAt" OR NEW."Reason" <> OLD."Reason"
            OR NEW."CreatedAt" <> OLD."CreatedAt" THEN
        RAISE EXCEPTION 'Leave request facts are immutable.' USING ERRCODE = '23514';
    END IF;

    IF OLD."Status" = 'PENDING' AND NEW."Status" IN ('APPROVED', 'REJECTED') THEN
        SELECT app_user."Role", app_user."Active" INTO worker_role, worker_active
        FROM efikas.app_user app_user WHERE app_user."UserId" = OLD."WorkerId" FOR UPDATE;
        SELECT app_user."Role", app_user."Active" INTO actor_role, actor_active
        FROM efikas.app_user app_user WHERE app_user."UserId" = NEW."DecidedBy";
        IF worker_role NOT IN ('AGENT', 'OPERATIONAL_WORKER') OR worker_active IS DISTINCT FROM true
                OR NEW."EndsAt" <= CURRENT_TIMESTAMP
                OR actor_role IS DISTINCT FROM 'MANAGER' OR actor_active IS DISTINCT FROM true
                OR NEW."DecidedAt" IS NULL
                OR (NEW."Status" = 'REJECTED' AND (NEW."DecisionReason" IS NULL
                    OR length(btrim(NEW."DecisionReason")) = 0)) THEN
            RAISE EXCEPTION 'A leave decision requires an active manager.' USING ERRCODE = '23514';
        END IF;
    ELSIF OLD."Status" IN ('PENDING', 'APPROVED') AND NEW."Status" = 'CANCELLED' THEN
        IF NEW."CancelledBy" IS DISTINCT FROM OLD."WorkerId" OR NEW."CancelledAt" IS NULL
                OR NEW."EndsAt" <= CURRENT_TIMESTAMP
                OR NEW."DecidedBy" IS DISTINCT FROM OLD."DecidedBy"
                OR NEW."DecidedAt" IS DISTINCT FROM OLD."DecidedAt"
                OR NEW."DecisionReason" IS DISTINCT FROM OLD."DecisionReason" THEN
            RAISE EXCEPTION 'Only the worker can cancel their pending or approved leave.' USING ERRCODE = '23514';
        END IF;
    ELSE
        RAISE EXCEPTION 'Invalid leave request status transition.' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
