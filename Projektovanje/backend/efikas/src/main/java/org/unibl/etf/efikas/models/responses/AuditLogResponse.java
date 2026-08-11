package org.unibl.etf.efikas.models.responses;

import org.unibl.etf.efikas.models.enums.AuditEvent;

import java.time.Instant;

public record AuditLogResponse(
        Long auditLogId,
        AuditEvent event,
        Instant occurredAt,
        Integer actorId,
        Integer reservationId,
        Integer apartmentId,
        Long taskId,
        String details
) { }
