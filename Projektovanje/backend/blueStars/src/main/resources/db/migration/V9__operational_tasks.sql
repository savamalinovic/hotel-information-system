CREATE TABLE efikas.operational_task (
    "TaskId" bigserial PRIMARY KEY,
    "SpecializationId" smallint NOT NULL REFERENCES efikas.specialization ("SpecializationId") ON DELETE RESTRICT,
    "ApartmentId" integer REFERENCES efikas.apartment ("ApartmentId") ON DELETE RESTRICT,
    "ReservationId" integer REFERENCES efikas.reservation ("ReservationId") ON DELETE RESTRICT,
    "AssignedWorkerId" integer REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    "CreatedBy" integer NOT NULL REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    "Title" varchar(120) NOT NULL,
    "Description" varchar(1000) NOT NULL,
    "Priority" varchar(16) NOT NULL DEFAULT 'NORMAL',
    "Status" varchar(24) NOT NULL DEFAULT 'NEW',
    "Source" varchar(24) NOT NULL DEFAULT 'MANUAL',
    "CreatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Version" bigint NOT NULL DEFAULT 0,
    CONSTRAINT operational_task_priority_check CHECK ("Priority" IN ('LOW','NORMAL','HIGH','URGENT')),
    CONSTRAINT operational_task_status_check CHECK ("Status" IN ('NEW','ASSIGNED','IN_PROGRESS','BLOCKED','COMPLETED','CANCELLED')),
    CONSTRAINT operational_task_source_check CHECK ("Source" IN ('MANUAL','CHECKOUT')),
    CONSTRAINT operational_task_assignment_check CHECK (
        ("Status" = 'NEW' AND "AssignedWorkerId" IS NULL) OR
        ("Status" <> 'NEW' AND "AssignedWorkerId" IS NOT NULL) OR
        ("Status" = 'CANCELLED')
    ),
    CONSTRAINT operational_task_checkout_source_check CHECK ("Source" <> 'CHECKOUT' OR "ReservationId" IS NOT NULL)
);

CREATE UNIQUE INDEX uq_operational_task_active_worker ON efikas.operational_task ("AssignedWorkerId")
    WHERE "Status" IN ('ASSIGNED','IN_PROGRESS');
CREATE UNIQUE INDEX uq_operational_task_checkout_source ON efikas.operational_task ("ReservationId")
    WHERE "Source" = 'CHECKOUT';
CREATE INDEX idx_operational_task_queue ON efikas.operational_task ("SpecializationId", "Status", "Priority", "CreatedAt");

CREATE TABLE efikas.task_status_history (
    "TaskStatusHistoryId" bigserial PRIMARY KEY,
    "TaskId" bigint NOT NULL REFERENCES efikas.operational_task ("TaskId") ON DELETE RESTRICT,
    "FromStatus" varchar(24),
    "ToStatus" varchar(24) NOT NULL,
    "ActorId" integer NOT NULL REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    "Reason" varchar(300) NOT NULL,
    "ChangedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_task_status_history_timeline ON efikas.task_status_history ("TaskId", "ChangedAt", "TaskStatusHistoryId");

CREATE TABLE efikas.task_attachment (
    "TaskAttachmentId" bigserial PRIMARY KEY,
    "TaskId" bigint NOT NULL REFERENCES efikas.operational_task ("TaskId") ON DELETE RESTRICT,
    "StorageKey" varchar(512) NOT NULL UNIQUE,
    "OriginalName" varchar(255) NOT NULL,
    "ContentType" varchar(150),
    "SizeBytes" bigint NOT NULL CHECK ("SizeBytes" > 0 AND "SizeBytes" <= 10485760),
    "UploadedBy" integer NOT NULL REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    "UploadedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_task_attachment_task ON efikas.task_attachment ("TaskId", "UploadedAt", "TaskAttachmentId");

CREATE OR REPLACE FUNCTION efikas.guard_operational_task_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE worker_role varchar(32); worker_active boolean; reservation_apartment integer; specialization_code varchar(40);
BEGIN
    SELECT "Code" INTO specialization_code FROM efikas.specialization
    WHERE "SpecializationId" = NEW."SpecializationId";
    IF specialization_code = 'CLEANING' AND NEW."ApartmentId" IS NULL THEN
        RAISE EXCEPTION 'A cleaning task requires an apartment.' USING ERRCODE='23514';
    END IF;
    IF NEW."Source" = 'CHECKOUT' AND specialization_code <> 'CLEANING' THEN
        RAISE EXCEPTION 'A checkout task must use the CLEANING specialization.' USING ERRCODE='23514';
    END IF;
    IF NEW."ReservationId" IS NOT NULL THEN
        SELECT "ApartmentId" INTO reservation_apartment FROM efikas.reservation WHERE "ReservationId" = NEW."ReservationId";
        IF NEW."ApartmentId" IS NOT NULL AND NEW."ApartmentId" <> reservation_apartment THEN
            RAISE EXCEPTION 'Task apartment must match its reservation.' USING ERRCODE='23514';
        END IF;
    END IF;
    IF NEW."AssignedWorkerId" IS NOT NULL AND (TG_OP = 'INSERT' OR NEW."AssignedWorkerId" IS DISTINCT FROM OLD."AssignedWorkerId" OR NEW."Status" = 'IN_PROGRESS' AND OLD."Status" = 'BLOCKED') THEN
        SELECT "Role", "Active" INTO worker_role, worker_active FROM efikas.app_user WHERE "UserId"=NEW."AssignedWorkerId" FOR UPDATE;
        IF worker_role <> 'OPERATIONAL_WORKER' OR NOT worker_active OR NOT EXISTS (
            SELECT 1 FROM efikas.app_user_specialization aus WHERE aus."UserId"=NEW."AssignedWorkerId" AND aus."SpecializationId"=NEW."SpecializationId")
        OR NOT EXISTS (SELECT 1 FROM efikas.attendance_session a WHERE a."WorkerId"=NEW."AssignedWorkerId" AND a."ClockedOutAt" IS NULL)
        OR EXISTS (SELECT 1 FROM efikas.break_period b JOIN efikas.attendance_session a USING ("AttendanceSessionId") WHERE a."WorkerId"=NEW."AssignedWorkerId" AND b."EndedAt" IS NULL)
        OR EXISTS (SELECT 1 FROM efikas.availability_override o WHERE o."WorkerId"=NEW."AssignedWorkerId" AND o."ClearedAt" IS NULL AND o."StartsAt" <= CURRENT_TIMESTAMP AND (o."EndsAt" IS NULL OR o."EndsAt" > CURRENT_TIMESTAMP)) THEN
            RAISE EXCEPTION 'Worker is not eligible and available for this task.' USING ERRCODE='23514';
        END IF;
    END IF;
    IF TG_OP='UPDATE' AND NOT ((OLD."Status"='NEW' AND NEW."Status" IN ('ASSIGNED','CANCELLED')) OR (OLD."Status"='ASSIGNED' AND NEW."Status" IN ('IN_PROGRESS','CANCELLED')) OR (OLD."Status"='IN_PROGRESS' AND NEW."Status" IN ('BLOCKED','COMPLETED','CANCELLED')) OR (OLD."Status"='BLOCKED' AND NEW."Status" IN ('IN_PROGRESS','CANCELLED'))) THEN
        RAISE EXCEPTION 'Invalid task status transition.' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER trg_guard_operational_task_write BEFORE INSERT OR UPDATE ON efikas.operational_task FOR EACH ROW EXECUTE FUNCTION efikas.guard_operational_task_write();

CREATE OR REPLACE FUNCTION efikas.reject_task_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Task records are retained as immutable history.' USING ERRCODE='23514'; END $$;
CREATE TRIGGER trg_reject_task_status_history_mutation BEFORE UPDATE OR DELETE ON efikas.task_status_history FOR EACH ROW EXECUTE FUNCTION efikas.reject_task_history_mutation();
CREATE TRIGGER trg_reject_task_attachment_mutation BEFORE UPDATE OR DELETE ON efikas.task_attachment FOR EACH ROW EXECUTE FUNCTION efikas.reject_task_history_mutation();
