package org.unibl.etf.blueStars.models.responses;

import org.unibl.etf.blueStars.models.enums.ReservationStatus;

import java.time.Instant;

public record ReservationStatusHistoryResponse(
        Long reservationStatusHistoryId,
        ReservationStatus status,
        String reason,
        Integer changedByUserId,
        Instant changedAt
) {
}
