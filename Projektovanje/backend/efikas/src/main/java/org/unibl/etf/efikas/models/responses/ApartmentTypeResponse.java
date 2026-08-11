package org.unibl.etf.efikas.models.responses;

import java.math.BigDecimal;
import java.time.Instant;

public record ApartmentTypeResponse(
        Integer apartmentTypeId,
        String name,
        String description,
        Integer capacity,
        BigDecimal defaultNightlyRate,
        boolean active,
        Long version,
        Instant createdAt,
        Instant updatedAt
) {
}
