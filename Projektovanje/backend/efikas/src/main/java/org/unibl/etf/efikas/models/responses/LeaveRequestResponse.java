package org.unibl.etf.efikas.models.responses;

import org.unibl.etf.efikas.models.enums.LeaveRequestStatus;

import java.time.Instant;

public record LeaveRequestResponse(
        Long leaveRequestId,
        Integer workerId,
        String workerName,
        String workerSurname,
        Instant startsAt,
        Instant endsAt,
        String reason,
        LeaveRequestStatus status,
        Instant createdAt,
        Integer decidedBy,
        Instant decidedAt,
        String decisionReason,
        Integer cancelledBy,
        Instant cancelledAt
) {
}
