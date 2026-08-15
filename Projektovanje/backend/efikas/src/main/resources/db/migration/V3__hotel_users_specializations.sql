CREATE TABLE efikas.hotel_profile (
    "HotelProfileId" smallint PRIMARY KEY DEFAULT 1,
    "Name" varchar(100) NOT NULL,
    "LegalName" varchar(150),
    "Address" varchar(150),
    "City" varchar(80),
    "CountryCode" varchar(2),
    "PhoneNumber" varchar(30),
    "Email" varchar(100),
    "TaxId" varchar(32),
    "UpdatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT hotel_profile_singleton_check CHECK ("HotelProfileId" = 1),
    CONSTRAINT hotel_profile_country_code_check
        CHECK ("CountryCode" IS NULL OR "CountryCode" ~ '^[A-Z]{2}$')
);

INSERT INTO efikas.hotel_profile ("HotelProfileId", "Name")
VALUES (1, 'eFikas Hotel');

ALTER TABLE efikas.app_user
    ADD COLUMN "Active" boolean NOT NULL DEFAULT true,
    ADD COLUMN "CreatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "UpdatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN "PhoneNumber" DROP NOT NULL;

CREATE UNIQUE INDEX uq_app_user_email_case_insensitive
    ON efikas.app_user (lower("Email"));
CREATE UNIQUE INDEX uq_app_user_jmbg
    ON efikas.app_user ("JMBG");
CREATE INDEX idx_app_user_role_active
    ON efikas.app_user ("Role", "Active");

CREATE TABLE efikas.specialization (
    "SpecializationId" smallserial PRIMARY KEY,
    "Code" varchar(40) NOT NULL UNIQUE,
    "Name" varchar(80) NOT NULL UNIQUE
);

INSERT INTO efikas.specialization ("Code", "Name") VALUES
    ('CLEANING', 'Čišćenje'),
    ('ELECTRICAL', 'Elektrika'),
    ('PLUMBING', 'Vodoinstalacije'),
    ('GENERAL_MAINTENANCE', 'Opšte održavanje'),
    ('INSPECTION', 'Inspekcija'),
    ('APARTMENT_PREPARATION', 'Priprema apartmana');

CREATE TABLE efikas.app_user_specialization (
    "UserId" integer NOT NULL,
    "SpecializationId" smallint NOT NULL,
    CONSTRAINT pk_app_user_specialization PRIMARY KEY ("UserId", "SpecializationId"),
    CONSTRAINT fk_app_user_specialization_user FOREIGN KEY ("UserId")
        REFERENCES efikas.app_user ("UserId") ON DELETE CASCADE,
    CONSTRAINT fk_app_user_specialization_specialization FOREIGN KEY ("SpecializationId")
        REFERENCES efikas.specialization ("SpecializationId") ON DELETE RESTRICT
);

CREATE INDEX idx_app_user_specialization_specialization
    ON efikas.app_user_specialization ("SpecializationId");
