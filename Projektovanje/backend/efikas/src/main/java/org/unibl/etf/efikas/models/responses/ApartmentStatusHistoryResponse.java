package org.unibl.etf.efikas.models.responses;

import org.unibl.etf.efikas.models.enums.ApartmentOperationalStatus;

import java.time.Instant;

public record ApartmentStatusHistoryResponse(
        Long apartmentStatusHistoryId,
        ApartmentOperationalStatus status,
        String reason,
        Integer changedByUserId,
        Instant changedAt
) {
}
