ALTER TABLE efikas."notification"
    ADD COLUMN "TaskId" BIGINT NULL;

ALTER TABLE efikas."notification"
    ADD CONSTRAINT fk_notification_task
        FOREIGN KEY ("TaskId") REFERENCES efikas.operational_task ("TaskId") ON DELETE RESTRICT;

CREATE INDEX idx_notification_task
    ON efikas."notification" ("TaskId")
    WHERE "TaskId" IS NOT NULL;

CREATE UNIQUE INDEX uq_notification_recipient_task_type
    ON efikas."notification" ("RecipientId", "TaskId", "Type")
    WHERE "TaskId" IS NOT NULL;
