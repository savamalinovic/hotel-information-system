CREATE TABLE efikas."notification" (
    "NotificationId" BIGSERIAL PRIMARY KEY,
    "RecipientId" INTEGER NOT NULL REFERENCES efikas."app_user"("UserId") ON DELETE RESTRICT,
    "Type" VARCHAR(64) NOT NULL,
    "Title" VARCHAR(160) NOT NULL,
    "Body" VARCHAR(1000) NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ReadAt" TIMESTAMPTZ NULL
);

CREATE INDEX idx_notification_recipient_created
    ON efikas."notification" ("RecipientId", "CreatedAt" DESC, "NotificationId" DESC);
CREATE INDEX idx_notification_recipient_unread
    ON efikas."notification" ("RecipientId", "CreatedAt" DESC) WHERE "ReadAt" IS NULL;

