package org.unibl.etf.efikas.models.responses;

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
