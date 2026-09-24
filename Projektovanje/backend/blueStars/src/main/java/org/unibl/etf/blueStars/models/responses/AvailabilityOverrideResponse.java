package org.unibl.etf.blueStars.models.responses;

import java.time.Instant;

public record AvailabilityOverrideResponse(
        Long availabilityOverrideId,
        Integer workerId,
        Instant startsAt,
        Instant endsAt,
        String reason,
        Integer createdByUserId,
        Instant createdAt,
        Instant clearedAt,
        Integer clearedByUserId
) {
}
