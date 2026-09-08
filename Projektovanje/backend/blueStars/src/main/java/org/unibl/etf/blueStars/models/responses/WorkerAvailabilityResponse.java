package org.unibl.etf.blueStars.models.responses;

import org.unibl.etf.blueStars.models.enums.WorkerAvailabilityStatus;
import org.unibl.etf.blueStars.models.enums.UserRole;

import java.time.Instant;
import java.time.LocalDate;

public record WorkerAvailabilityResponse(
        Integer workerId,
        String name,
        String surname,
        UserRole role,
        WorkerAvailabilityStatus status,
        Long attendanceSessionId,
        Instant clockedInAt,
        Instant breakStartedAt,
        Long availabilityOverrideId,
        Instant unavailableUntil,
        String unavailabilityReason,
        Long leaveRequestId,
        LocalDate leaveEndDate,
        String leaveReason
) {
}
