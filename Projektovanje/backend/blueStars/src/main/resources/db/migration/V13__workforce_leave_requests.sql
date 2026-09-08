CREATE TABLE efikas.leave_request (
    "LeaveRequestId" bigserial PRIMARY KEY,
    "WorkerId" integer NOT NULL,
    "StartsAt" timestamptz NOT NULL,
    "EndsAt" timestamptz NOT NULL,
    "Reason" varchar(300) NOT NULL,
    "Status" varchar(16) NOT NULL DEFAULT 'PENDING',
    "CreatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "DecidedBy" integer,
    "DecidedAt" timestamptz,
    "DecisionReason" varchar(300),
    "CancelledBy" integer,
    "CancelledAt" timestamptz,
    CONSTRAINT fk_leave_request_worker FOREIGN KEY ("WorkerId")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    CONSTRAINT fk_leave_request_decided_by FOREIGN KEY ("DecidedBy")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    CONSTRAINT fk_leave_request_cancelled_by FOREIGN KEY ("CancelledBy")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    CONSTRAINT leave_request_period_check CHECK ("EndsAt" > "StartsAt"),
    CONSTRAINT leave_request_reason_check CHECK (length(btrim("Reason")) > 0),
    CONSTRAINT leave_request_status_check CHECK ("Status" IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    CONSTRAINT leave_request_decision_pair_check CHECK (
        ("Status" IN ('PENDING', 'CANCELLED') AND "DecidedBy" IS NULL AND "DecidedAt" IS NULL
            AND "DecisionReason" IS NULL)
        OR ("Status" = 'APPROVED' AND "DecidedBy" IS NOT NULL AND "DecidedAt" IS NOT NULL)
        OR ("Status" = 'REJECTED' AND "DecidedBy" IS NOT NULL AND "DecidedAt" IS NOT NULL
            AND "DecisionReason" IS NOT NULL AND length(btrim("DecisionReason")) > 0)
        OR ("Status" = 'CANCELLED' AND "DecidedBy" IS NOT NULL AND "DecidedAt" IS NOT NULL)
    ),
    CONSTRAINT leave_request_cancel_pair_check CHECK (
        ("Status" <> 'CANCELLED' AND "CancelledBy" IS NULL AND "CancelledAt" IS NULL)
        OR ("Status" = 'CANCELLED' AND "CancelledBy" IS NOT NULL AND "CancelledAt" IS NOT NULL)
    )
);

CREATE INDEX idx_leave_request_worker_timeline
    ON efikas.leave_request ("WorkerId", "CreatedAt" DESC, "LeaveRequestId" DESC);
CREATE INDEX idx_leave_request_manager_queue
    ON efikas.leave_request ("Status", "StartsAt", "LeaveRequestId");
CREATE INDEX idx_leave_request_current_approved
    ON efikas.leave_request ("WorkerId", "StartsAt", "EndsAt") WHERE "Status" = 'APPROVED';

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
    IF worker_role <> 'OPERATIONAL_WORKER' OR NOT worker_active OR NEW."Status" <> 'PENDING'
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

CREATE TRIGGER trg_guard_leave_request_insert
BEFORE INSERT ON efikas.leave_request
FOR EACH ROW EXECUTE FUNCTION efikas.guard_leave_request_insert();

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
        IF worker_role IS DISTINCT FROM 'OPERATIONAL_WORKER' OR worker_active IS DISTINCT FROM true
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

CREATE TRIGGER trg_guard_leave_request_update
BEFORE UPDATE ON efikas.leave_request
FOR EACH ROW EXECUTE FUNCTION efikas.guard_leave_request_update();

CREATE TRIGGER trg_reject_leave_request_delete
BEFORE DELETE ON efikas.leave_request
FOR EACH ROW EXECUTE FUNCTION efikas.reject_attendance_session_delete();
