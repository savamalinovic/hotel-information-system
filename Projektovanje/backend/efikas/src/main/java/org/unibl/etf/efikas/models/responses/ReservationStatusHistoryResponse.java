package org.unibl.etf.efikas.models.responses;

import org.unibl.etf.efikas.models.enums.ReservationStatus;

import java.time.Instant;

public record ReservationStatusHistoryResponse(
        Long reservationStatusHistoryId,
        ReservationStatus status,
        String reason,
        Integer changedByUserId,
        Instant changedAt
) {
}
