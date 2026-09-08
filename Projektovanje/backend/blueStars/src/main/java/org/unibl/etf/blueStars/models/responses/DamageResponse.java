package org.unibl.etf.blueStars.models.responses;

import java.math.BigDecimal;
import java.time.Instant;

public record DamageResponse(
        Long damageId,
        Integer apartmentId,
        String title,
        String description,
        BigDecimal estimatedAmount,
        BigDecimal confirmedAmount,
        Integer createdBy,
        String authorName,
        String authorSurname,
        Instant createdAt,
        Integer updatedBy,
        Instant updatedAt
) {
}
