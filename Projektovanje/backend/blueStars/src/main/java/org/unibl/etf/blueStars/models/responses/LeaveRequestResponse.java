package org.unibl.etf.blueStars.models.responses;

import org.unibl.etf.blueStars.models.enums.LeaveRequestStatus;
import org.unibl.etf.blueStars.models.enums.UserRole;

import java.time.Instant;
import java.time.LocalDate;

public record LeaveRequestResponse(
        Long leaveRequestId,
        Integer workerId,
        String workerName,
        String workerSurname,
        UserRole workerRole,
        LocalDate startDate,
        LocalDate endDate,
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
