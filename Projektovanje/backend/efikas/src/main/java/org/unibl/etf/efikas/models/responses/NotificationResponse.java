package org.unibl.etf.efikas.models.responses;

import java.time.Instant;

public record NotificationResponse(Long notificationId, String type, String title, String body,
                                   Instant createdAt, Instant readAt) {}
