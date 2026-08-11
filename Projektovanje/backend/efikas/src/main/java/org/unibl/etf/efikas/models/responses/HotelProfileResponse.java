package org.unibl.etf.efikas.models.responses;

import java.time.Instant;

public record HotelProfileResponse(
        String name,
        String legalName,
        String address,
        String city,
        String countryCode,
        String phoneNumber,
        String email,
        String taxId,
        Instant updatedAt
) {
}
