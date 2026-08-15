package org.unibl.etf.efikas.models.responses;

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
