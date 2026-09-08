CREATE TABLE efikas.audit_log (
    "AuditLogId" bigserial PRIMARY KEY,
    "Event" varchar(64) NOT NULL,
    "OccurredAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ActorId" integer NOT NULL REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    "ReservationId" integer REFERENCES efikas.reservation ("ReservationId") ON DELETE RESTRICT,
    "ApartmentId" integer REFERENCES efikas.apartment ("ApartmentId") ON DELETE RESTRICT,
    "TaskId" bigint REFERENCES efikas.operational_task ("TaskId") ON DELETE RESTRICT,
    "Details" varchar(500),
    CONSTRAINT audit_log_event_not_blank CHECK (length(btrim("Event")) > 0)
);

CREATE INDEX idx_audit_log_timeline ON efikas.audit_log ("OccurredAt" DESC, "AuditLogId" DESC);
CREATE INDEX idx_audit_log_actor_timeline ON efikas.audit_log ("ActorId", "OccurredAt" DESC, "AuditLogId" DESC);
CREATE INDEX idx_audit_log_event_timeline ON efikas.audit_log ("Event", "OccurredAt" DESC, "AuditLogId" DESC);
CREATE INDEX idx_audit_log_reservation_timeline ON efikas.audit_log ("ReservationId", "OccurredAt" DESC, "AuditLogId" DESC)
    WHERE "ReservationId" IS NOT NULL;
CREATE INDEX idx_audit_log_apartment_timeline ON efikas.audit_log ("ApartmentId", "OccurredAt" DESC, "AuditLogId" DESC)
    WHERE "ApartmentId" IS NOT NULL;
CREATE INDEX idx_audit_log_task_timeline ON efikas.audit_log ("TaskId", "OccurredAt" DESC, "AuditLogId" DESC)
    WHERE "TaskId" IS NOT NULL;

CREATE OR REPLACE FUNCTION efikas.reject_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Audit records are append-only and cannot be changed or deleted.' USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER trg_reject_audit_log_mutation
BEFORE UPDATE OR DELETE ON efikas.audit_log
FOR EACH ROW EXECUTE FUNCTION efikas.reject_audit_log_mutation();
