package org.unibl.etf.blueStars.models.responses;

import java.time.Instant;

public record ExpenseCategoryResponse(
        Integer expenseCategoryId,
        String name,
        String description,
        boolean active,
        Integer createdBy,
        Instant createdAt,
        Integer updatedBy,
        Instant updatedAt
) {
}
