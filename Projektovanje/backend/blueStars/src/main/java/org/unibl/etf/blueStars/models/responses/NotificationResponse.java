package org.unibl.etf.blueStars.models.responses;

import java.time.Instant;

public record NotificationResponse(Long notificationId, String type, String title, String body,
                                   Instant createdAt, Instant readAt, Long taskId) {}
