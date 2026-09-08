package org.unibl.etf.blueStars.models.responses;

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
