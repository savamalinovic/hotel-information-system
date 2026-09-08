CREATE TABLE efikas.attendance_session (
    "AttendanceSessionId" bigserial PRIMARY KEY,
    "WorkerId" integer NOT NULL,
    "ClockedInAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ClockedOutAt" timestamptz,
    CONSTRAINT fk_attendance_session_worker FOREIGN KEY ("WorkerId")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    CONSTRAINT attendance_session_period_check
        CHECK ("ClockedOutAt" IS NULL OR "ClockedOutAt" > "ClockedInAt")
);

CREATE UNIQUE INDEX uq_attendance_session_open_worker
    ON efikas.attendance_session ("WorkerId") WHERE "ClockedOutAt" IS NULL;
CREATE INDEX idx_attendance_session_worker_timeline
    ON efikas.attendance_session ("WorkerId", "ClockedInAt" DESC, "AttendanceSessionId" DESC);

CREATE TABLE efikas.break_period (
    "BreakPeriodId" bigserial PRIMARY KEY,
    "AttendanceSessionId" bigint NOT NULL,
    "StartedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "EndedAt" timestamptz,
    CONSTRAINT fk_break_period_session FOREIGN KEY ("AttendanceSessionId")
        REFERENCES efikas.attendance_session ("AttendanceSessionId") ON DELETE RESTRICT,
    CONSTRAINT break_period_check CHECK ("EndedAt" IS NULL OR "EndedAt" > "StartedAt")
);

CREATE UNIQUE INDEX uq_break_period_open_session
    ON efikas.break_period ("AttendanceSessionId") WHERE "EndedAt" IS NULL;
CREATE INDEX idx_break_period_session_timeline
    ON efikas.break_period ("AttendanceSessionId", "StartedAt", "BreakPeriodId");

CREATE TABLE efikas.availability_override (
    "AvailabilityOverrideId" bigserial PRIMARY KEY,
    "WorkerId" integer NOT NULL,
    "StartsAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "EndsAt" timestamptz,
    "Reason" varchar(300) NOT NULL,
    "CreatedBy" integer NOT NULL,
    "CreatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ClearedAt" timestamptz,
    "ClearedBy" integer,
    CONSTRAINT fk_availability_override_worker FOREIGN KEY ("WorkerId")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    CONSTRAINT fk_availability_override_created_by FOREIGN KEY ("CreatedBy")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    CONSTRAINT fk_availability_override_cleared_by FOREIGN KEY ("ClearedBy")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    CONSTRAINT availability_override_period_check CHECK ("EndsAt" IS NULL OR "EndsAt" > "StartsAt"),
    CONSTRAINT availability_override_clear_pair_check CHECK (
        ("ClearedAt" IS NULL AND "ClearedBy" IS NULL)
        OR ("ClearedAt" IS NOT NULL AND "ClearedBy" IS NOT NULL)
    )
);

CREATE INDEX idx_availability_override_worker_timeline
    ON efikas.availability_override ("WorkerId", "StartsAt" DESC, "AvailabilityOverrideId" DESC);
CREATE INDEX idx_availability_override_active
    ON efikas.availability_override ("WorkerId", "StartsAt", "EndsAt") WHERE "ClearedAt" IS NULL;

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
    IF worker_role <> 'OPERATIONAL_WORKER' OR NOT worker_active THEN
        RAISE EXCEPTION 'Only an active operational worker can clock in.' USING ERRCODE = '23514';
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

CREATE TRIGGER trg_guard_attendance_session_insert
BEFORE INSERT ON efikas.attendance_session
FOR EACH ROW EXECUTE FUNCTION efikas.guard_attendance_session_insert();

CREATE OR REPLACE FUNCTION efikas.guard_attendance_session_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."WorkerId" <> OLD."WorkerId" OR NEW."ClockedInAt" <> OLD."ClockedInAt"
            OR OLD."ClockedOutAt" IS NOT NULL OR NEW."ClockedOutAt" IS NULL THEN
        RAISE EXCEPTION 'Attendance sessions can only be closed once.' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (
        SELECT 1 FROM efikas.break_period break
        WHERE break."AttendanceSessionId" = OLD."AttendanceSessionId" AND break."EndedAt" IS NULL
    ) THEN
        RAISE EXCEPTION 'An attendance session cannot close during an open break.' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (
        SELECT 1 FROM efikas.break_period break
        WHERE break."AttendanceSessionId" = OLD."AttendanceSessionId"
          AND break."EndedAt" > NEW."ClockedOutAt"
    ) THEN
        RAISE EXCEPTION 'Attendance cannot close before its last break ended.' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_attendance_session_update
BEFORE UPDATE ON efikas.attendance_session
FOR EACH ROW EXECUTE FUNCTION efikas.guard_attendance_session_update();

CREATE OR REPLACE FUNCTION efikas.reject_attendance_session_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Attendance sessions are retained as history.' USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER trg_reject_attendance_session_delete
BEFORE DELETE ON efikas.attendance_session
FOR EACH ROW EXECUTE FUNCTION efikas.reject_attendance_session_delete();

CREATE OR REPLACE FUNCTION efikas.guard_break_period_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    session_clocked_in_at timestamptz;
    session_clocked_out_at timestamptz;
BEGIN
    IF NEW."EndedAt" IS NOT NULL THEN
        RAISE EXCEPTION 'A new break period must be open.' USING ERRCODE = '23514';
    END IF;
    SELECT session."ClockedInAt", session."ClockedOutAt"
    INTO session_clocked_in_at, session_clocked_out_at
    FROM efikas.attendance_session session
    WHERE session."AttendanceSessionId" = NEW."AttendanceSessionId"
    FOR UPDATE;

    IF session_clocked_in_at IS NULL THEN
        RAISE EXCEPTION 'Attendance session not found for break.' USING ERRCODE = '23503';
    END IF;
    IF session_clocked_out_at IS NOT NULL OR NEW."StartedAt" < session_clocked_in_at THEN
        RAISE EXCEPTION 'A break requires an open attendance session.' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (
        SELECT 1 FROM efikas.break_period break
        WHERE break."AttendanceSessionId" = NEW."AttendanceSessionId" AND break."EndedAt" IS NULL
    ) THEN
        RAISE EXCEPTION 'Attendance session already has an open break.' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_break_period_insert
BEFORE INSERT ON efikas.break_period
FOR EACH ROW EXECUTE FUNCTION efikas.guard_break_period_insert();

CREATE OR REPLACE FUNCTION efikas.guard_break_period_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."AttendanceSessionId" <> OLD."AttendanceSessionId"
            OR NEW."StartedAt" <> OLD."StartedAt"
            OR OLD."EndedAt" IS NOT NULL OR NEW."EndedAt" IS NULL THEN
        RAISE EXCEPTION 'Break periods can only be closed once.' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_break_period_update
BEFORE UPDATE ON efikas.break_period
FOR EACH ROW EXECUTE FUNCTION efikas.guard_break_period_update();

CREATE TRIGGER trg_reject_break_period_delete
BEFORE DELETE ON efikas.break_period
FOR EACH ROW EXECUTE FUNCTION efikas.reject_attendance_session_delete();

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
    IF worker_role <> 'OPERATIONAL_WORKER' OR NOT worker_active
            OR NEW."CreatedBy" <> NEW."WorkerId" THEN
        RAISE EXCEPTION 'Only an active worker can create a self availability override.'
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

CREATE TRIGGER trg_guard_availability_override_insert
BEFORE INSERT ON efikas.availability_override
FOR EACH ROW EXECUTE FUNCTION efikas.guard_availability_override_insert();

CREATE OR REPLACE FUNCTION efikas.guard_availability_override_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."WorkerId" <> OLD."WorkerId" OR NEW."StartsAt" <> OLD."StartsAt"
            OR NEW."EndsAt" IS DISTINCT FROM OLD."EndsAt" OR NEW."Reason" <> OLD."Reason"
            OR NEW."CreatedBy" <> OLD."CreatedBy" OR NEW."CreatedAt" <> OLD."CreatedAt"
            OR OLD."ClearedAt" IS NOT NULL OR NEW."ClearedAt" IS NULL
            OR NEW."ClearedBy" <> OLD."WorkerId" THEN
        RAISE EXCEPTION 'Availability overrides can only be cleared once by their worker.'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_availability_override_update
BEFORE UPDATE ON efikas.availability_override
FOR EACH ROW EXECUTE FUNCTION efikas.guard_availability_override_update();

CREATE TRIGGER trg_reject_availability_override_delete
BEFORE DELETE ON efikas.availability_override
FOR EACH ROW EXECUTE FUNCTION efikas.reject_attendance_session_delete();

CREATE OR REPLACE FUNCTION efikas.guard_worker_lifecycle_with_open_attendance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF (NEW."Role" <> 'OPERATIONAL_WORKER' OR NOT NEW."Active")
            AND EXISTS (
                SELECT 1 FROM efikas.attendance_session session
                WHERE session."WorkerId" = OLD."UserId" AND session."ClockedOutAt" IS NULL
            ) THEN
        RAISE EXCEPTION 'Open attendance must be closed before changing worker lifecycle.'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_worker_lifecycle_with_open_attendance
BEFORE UPDATE OF "Role", "Active" ON efikas.app_user
FOR EACH ROW EXECUTE FUNCTION efikas.guard_worker_lifecycle_with_open_attendance();
