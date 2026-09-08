package org.unibl.etf.blueStars.models.responses;

import java.math.BigDecimal;

public record AvailableApartmentResponse(
        Integer apartmentId,
        String name,
        String address,
        Integer floor,
        Integer apartmentTypeId,
        String apartmentTypeName,
        Integer capacity,
        BigDecimal defaultNightlyRate
) {
}
