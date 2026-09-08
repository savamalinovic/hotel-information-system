package org.unibl.etf.blueStars.models.responses;

import org.unibl.etf.blueStars.models.enums.ApartmentOperationalStatus;

import java.time.Instant;

public record ApartmentStatusHistoryResponse(
        Long apartmentStatusHistoryId,
        ApartmentOperationalStatus status,
        String reason,
        Integer changedByUserId,
        Instant changedAt
) {
}
