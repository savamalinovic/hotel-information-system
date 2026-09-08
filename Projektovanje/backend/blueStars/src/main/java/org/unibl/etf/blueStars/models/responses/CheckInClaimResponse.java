package org.unibl.etf.blueStars.models.responses;

import java.time.Instant;

public record CheckInClaimResponse(
        Integer reservationId,
        Integer claimedByUserId,
        String claimedByName,
        Instant claimedAt
) {
}
