CREATE TABLE efikas.damage_record (
    "DamageId" bigserial PRIMARY KEY,
    "ApartmentId" integer NOT NULL,
    "Title" varchar(120) NOT NULL,
    "Description" varchar(2000) NOT NULL,
    "EstimatedAmount" numeric(14, 2),
    "ConfirmedAmount" numeric(14, 2),
    "CreatedBy" integer NOT NULL,
    "CreatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" integer NOT NULL,
    "UpdatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_damage_record_apartment FOREIGN KEY ("ApartmentId")
        REFERENCES efikas.apartment ("ApartmentId") ON DELETE RESTRICT,
    CONSTRAINT fk_damage_record_created_by FOREIGN KEY ("CreatedBy")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    CONSTRAINT fk_damage_record_updated_by FOREIGN KEY ("UpdatedBy")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    CONSTRAINT damage_record_title_check CHECK (length(btrim("Title")) > 0),
    CONSTRAINT damage_record_description_check CHECK (length(btrim("Description")) > 0),
    CONSTRAINT damage_record_estimated_amount_check CHECK ("EstimatedAmount" IS NULL OR "EstimatedAmount" > 0),
    CONSTRAINT damage_record_confirmed_amount_check CHECK ("ConfirmedAmount" IS NULL OR "ConfirmedAmount" > 0),
    CONSTRAINT damage_record_update_time_check CHECK ("UpdatedAt" >= "CreatedAt")
);

CREATE INDEX idx_damage_record_apartment_timeline
    ON efikas.damage_record ("ApartmentId", "CreatedAt" DESC, "DamageId" DESC);
CREATE INDEX idx_damage_record_created_by ON efikas.damage_record ("CreatedBy", "CreatedAt" DESC);

CREATE TABLE efikas.damage_attachment (
    "DamageAttachmentId" bigserial PRIMARY KEY,
    "DamageId" bigint NOT NULL,
    "StorageKey" varchar(512) NOT NULL UNIQUE,
    "OriginalName" varchar(255) NOT NULL,
    "ContentType" varchar(150),
    "SizeBytes" bigint NOT NULL,
    "UploadedBy" integer NOT NULL,
    "UploadedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_damage_attachment_damage FOREIGN KEY ("DamageId")
        REFERENCES efikas.damage_record ("DamageId") ON DELETE RESTRICT,
    CONSTRAINT fk_damage_attachment_uploaded_by FOREIGN KEY ("UploadedBy")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    CONSTRAINT damage_attachment_name_check CHECK (length(btrim("OriginalName")) > 0),
    CONSTRAINT damage_attachment_size_check CHECK ("SizeBytes" > 0 AND "SizeBytes" <= 10485760)
);

CREATE INDEX idx_damage_attachment_damage
    ON efikas.damage_attachment ("DamageId", "UploadedAt", "DamageAttachmentId");

CREATE OR REPLACE FUNCTION efikas.guard_damage_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    actor_role varchar(32);
    actor_active boolean;
    apartment_active boolean;
BEGIN
    SELECT apartment."Active" INTO apartment_active
    FROM efikas.apartment apartment WHERE apartment."ApartmentId" = NEW."ApartmentId" FOR UPDATE;
    SELECT app_user."Role", app_user."Active" INTO actor_role, actor_active
    FROM efikas.app_user app_user WHERE app_user."UserId" = NEW."CreatedBy";
    IF apartment_active IS DISTINCT FROM true OR actor_role NOT IN ('MANAGER', 'AGENT')
            OR actor_active IS DISTINCT FROM true OR NEW."UpdatedBy" <> NEW."CreatedBy"
            OR NEW."UpdatedAt" <> NEW."CreatedAt" THEN
        RAISE EXCEPTION 'Only active reception staff can report damage for an active apartment.'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_damage_insert
BEFORE INSERT ON efikas.damage_record
FOR EACH ROW EXECUTE FUNCTION efikas.guard_damage_insert();

CREATE OR REPLACE FUNCTION efikas.guard_damage_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    actor_role varchar(32);
    actor_active boolean;
BEGIN
    SELECT app_user."Role", app_user."Active" INTO actor_role, actor_active
    FROM efikas.app_user app_user WHERE app_user."UserId" = NEW."UpdatedBy";
    IF NEW."ApartmentId" <> OLD."ApartmentId" OR NEW."CreatedBy" <> OLD."CreatedBy"
            OR NEW."CreatedAt" <> OLD."CreatedAt" OR NEW."UpdatedAt" <= OLD."UpdatedAt"
            OR actor_role IS DISTINCT FROM 'MANAGER' OR actor_active IS DISTINCT FROM true THEN
        RAISE EXCEPTION 'Damage can only be updated by an active manager; creation facts are immutable.'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_damage_update
BEFORE UPDATE ON efikas.damage_record
FOR EACH ROW EXECUTE FUNCTION efikas.guard_damage_update();

CREATE OR REPLACE FUNCTION efikas.guard_damage_attachment_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    actor_role varchar(32);
    actor_active boolean;
    damage_apartment_id integer;
BEGIN
    SELECT damage."ApartmentId" INTO damage_apartment_id
    FROM efikas.damage_record damage WHERE damage."DamageId" = NEW."DamageId";
    SELECT app_user."Role", app_user."Active" INTO actor_role, actor_active
    FROM efikas.app_user app_user WHERE app_user."UserId" = NEW."UploadedBy";

    IF actor_active IS DISTINCT FROM true OR (
        actor_role NOT IN ('MANAGER', 'AGENT') AND NOT (
            actor_role = 'OPERATIONAL_WORKER' AND EXISTS (
                SELECT 1 FROM efikas.operational_task task
                WHERE task."AssignedWorkerId" = NEW."UploadedBy"
                  AND task."ApartmentId" = damage_apartment_id
                  AND task."Status" IN ('ASSIGNED', 'IN_PROGRESS', 'BLOCKED')
            )
        )
    ) THEN
        RAISE EXCEPTION 'Damage attachments require reception access or a relevant active worker task.'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_damage_attachment_insert
BEFORE INSERT ON efikas.damage_attachment
FOR EACH ROW EXECUTE FUNCTION efikas.guard_damage_attachment_insert();

CREATE OR REPLACE FUNCTION efikas.reject_damage_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Damage records and attachments are retained as history.' USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER trg_reject_damage_delete
BEFORE DELETE ON efikas.damage_record
FOR EACH ROW EXECUTE FUNCTION efikas.reject_damage_delete();

CREATE TRIGGER trg_reject_damage_attachment_mutation
BEFORE UPDATE OR DELETE ON efikas.damage_attachment
FOR EACH ROW EXECUTE FUNCTION efikas.reject_damage_delete();
