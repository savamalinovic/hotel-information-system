package org.unibl.etf.blueStars.models.responses;

import java.time.Instant;
import java.time.LocalDate;

public record ApartmentUnavailabilityResponse(
        Long apartmentUnavailabilityId,
        LocalDate startDate,
        LocalDate endDate,
        String reason,
        Integer createdByUserId,
        Instant createdAt
) {
}
