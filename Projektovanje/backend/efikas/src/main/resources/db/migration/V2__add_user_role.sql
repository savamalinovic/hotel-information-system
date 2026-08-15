ALTER TABLE efikas.app_user
    ADD COLUMN "Role" varchar(32) NOT NULL DEFAULT 'AGENT';

ALTER TABLE efikas.app_user
    ADD CONSTRAINT app_user_role_check
        CHECK ("Role" IN ('MANAGER', 'AGENT', 'OPERATIONAL_WORKER'));
