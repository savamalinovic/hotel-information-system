package org.unibl.etf.efikas.models.responses;

import org.unibl.etf.efikas.models.enums.LeaveRequestStatus;
import org.unibl.etf.efikas.models.enums.UserRole;

import java.time.Instant;

public record LeaveRequestResponse(
        Long leaveRequestId,
        Integer workerId,
        String workerName,
        String workerSurname,
        UserRole workerRole,
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
