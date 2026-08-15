package org.unibl.etf.efikas.models.responses;

import org.unibl.etf.efikas.models.enums.WorkerAvailabilityStatus;

import java.time.Instant;

public record WorkerAvailabilityResponse(
        Integer workerId,
        String name,
        String surname,
        WorkerAvailabilityStatus status,
        Long attendanceSessionId,
        Instant clockedInAt,
        Instant breakStartedAt,
        Long availabilityOverrideId,
        Instant unavailableUntil,
        String unavailabilityReason,
        Long leaveRequestId,
        Instant leaveUntil,
        String leaveReason
) {
}
