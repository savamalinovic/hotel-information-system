CREATE TABLE efikas.apartment_type (
    "ApartmentTypeId" serial PRIMARY KEY,
    "Name" varchar(80) NOT NULL,
    "Description" varchar(500),
    "Capacity" integer NOT NULL,
    "DefaultNightlyRate" numeric(12, 2) NOT NULL,
    "Active" boolean NOT NULL DEFAULT true,
    "Version" bigint NOT NULL DEFAULT 0,
    "CreatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT apartment_type_capacity_check CHECK ("Capacity" > 0),
    CONSTRAINT apartment_type_default_rate_check CHECK ("DefaultNightlyRate" >= 0)
);

CREATE UNIQUE INDEX uq_apartment_type_name_case_insensitive
    ON efikas.apartment_type (lower("Name"));

INSERT INTO efikas.apartment_type (
    "Name", "Description", "Capacity", "DefaultNightlyRate", "Active"
)
SELECT
    'Legacy ' || apartment."ApartmentId" || ' - ' || apartment."Name",
    'Automatically created while migrating a legacy apartment.',
    GREATEST(COALESCE(apartment."Capacity", 1), 1),
    CASE
        WHEN apartment."PricePerNight" BETWEEN 0 AND 9999999999.99
            THEN apartment."PricePerNight"::numeric(12, 2)
        ELSE 0::numeric(12, 2)
    END,
    true
FROM efikas.apartment apartment;

ALTER TABLE efikas.apartment
    ADD COLUMN "ApartmentTypeId" integer,
    ADD COLUMN "Floor" integer,
    ADD COLUMN "OperationalStatus" varchar(32) NOT NULL DEFAULT 'READY',
    ADD COLUMN "Active" boolean NOT NULL DEFAULT true,
    ADD COLUMN "Version" bigint NOT NULL DEFAULT 0,
    ADD COLUMN "CreatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "UpdatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN "NumberOfBeds" DROP NOT NULL,
    ALTER COLUMN "NumberOfRooms" DROP NOT NULL,
    ALTER COLUMN "Capacity" DROP NOT NULL,
    ALTER COLUMN "PricePerDay" DROP NOT NULL,
    ALTER COLUMN "PricePerNight" DROP NOT NULL,
    ALTER COLUMN "UserId" DROP NOT NULL;

UPDATE efikas.apartment apartment
SET "ApartmentTypeId" = apartment_type."ApartmentTypeId"
FROM efikas.apartment_type apartment_type
WHERE apartment_type."Name" = 'Legacy ' || apartment."ApartmentId" || ' - ' || apartment."Name";

ALTER TABLE efikas.apartment
    ALTER COLUMN "ApartmentTypeId" SET NOT NULL,
    DROP CONSTRAINT "FK_apartment_user",
    ADD CONSTRAINT fk_apartment_type FOREIGN KEY ("ApartmentTypeId")
        REFERENCES efikas.apartment_type ("ApartmentTypeId") ON DELETE RESTRICT,
    ADD CONSTRAINT fk_apartment_user_legacy FOREIGN KEY ("UserId")
        REFERENCES efikas.app_user ("UserId") ON DELETE SET NULL,
    ADD CONSTRAINT apartment_operational_status_check
        CHECK ("OperationalStatus" IN ('READY', 'DIRTY', 'CLEANING', 'MAINTENANCE'));

WITH duplicate_names AS (
    SELECT
        "ApartmentId",
        row_number() OVER (PARTITION BY lower("Name") ORDER BY "ApartmentId") AS occurrence
    FROM efikas.apartment
)
UPDATE efikas.apartment apartment
SET "Name" = left(apartment."Name", 37) || ' - ' || apartment."ApartmentId"
FROM duplicate_names duplicate
WHERE duplicate."ApartmentId" = apartment."ApartmentId"
  AND duplicate.occurrence > 1;

CREATE UNIQUE INDEX uq_apartment_name_case_insensitive
    ON efikas.apartment (lower("Name"));
CREATE INDEX idx_apartment_type_active
    ON efikas.apartment ("ApartmentTypeId", "Active");
CREATE INDEX idx_apartment_operational_status
    ON efikas.apartment ("OperationalStatus");

ALTER TABLE efikas.apartment_picture
    ADD COLUMN "PictureId" bigserial,
    ADD COLUMN "DisplayOrder" integer NOT NULL DEFAULT 0,
    ADD COLUMN "CreatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN "PictureURL" TYPE varchar(512),
    DROP CONSTRAINT "PK_apartment_picture",
    ADD CONSTRAINT pk_apartment_picture PRIMARY KEY ("PictureId"),
    ADD CONSTRAINT uq_apartment_picture_key UNIQUE ("ApartmentId", "PictureURL"),
    ADD CONSTRAINT apartment_picture_display_order_check CHECK ("DisplayOrder" >= 0);

CREATE INDEX idx_apartment_picture_order
    ON efikas.apartment_picture ("ApartmentId", "DisplayOrder", "PictureId");

CREATE TABLE efikas.apartment_unavailability (
    "ApartmentUnavailabilityId" bigserial PRIMARY KEY,
    "ApartmentId" integer NOT NULL,
    "StartDate" date NOT NULL,
    "EndDate" date NOT NULL,
    "Reason" varchar(300) NOT NULL,
    "CreatedBy" integer NOT NULL,
    "CreatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_apartment_unavailability_apartment FOREIGN KEY ("ApartmentId")
        REFERENCES efikas.apartment ("ApartmentId") ON DELETE RESTRICT,
    CONSTRAINT fk_apartment_unavailability_user FOREIGN KEY ("CreatedBy")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    CONSTRAINT apartment_unavailability_period_check CHECK ("StartDate" <= "EndDate")
);

CREATE INDEX idx_apartment_unavailability_period
    ON efikas.apartment_unavailability ("ApartmentId", "StartDate", "EndDate");

CREATE TABLE efikas.apartment_status_history (
    "ApartmentStatusHistoryId" bigserial PRIMARY KEY,
    "ApartmentId" integer NOT NULL,
    "Status" varchar(32) NOT NULL,
    "ChangedBy" integer,
    "Reason" varchar(300) NOT NULL,
    "ChangedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_apartment_status_history_apartment FOREIGN KEY ("ApartmentId")
        REFERENCES efikas.apartment ("ApartmentId") ON DELETE RESTRICT,
    CONSTRAINT fk_apartment_status_history_user FOREIGN KEY ("ChangedBy")
        REFERENCES efikas.app_user ("UserId") ON DELETE RESTRICT,
    CONSTRAINT apartment_status_history_status_check
        CHECK ("Status" IN ('READY', 'DIRTY', 'CLEANING', 'MAINTENANCE'))
);

INSERT INTO efikas.apartment_status_history (
    "ApartmentId", "Status", "ChangedBy", "Reason", "ChangedAt"
)
SELECT
    apartment."ApartmentId",
    apartment."OperationalStatus",
    apartment."UserId",
    'Initial status recorded during B02 migration.',
    apartment."CreatedAt"
FROM efikas.apartment apartment;

CREATE INDEX idx_apartment_status_history_timeline
    ON efikas.apartment_status_history ("ApartmentId", "ChangedAt" DESC, "ApartmentStatusHistoryId" DESC);
