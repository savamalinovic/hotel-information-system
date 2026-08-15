package org.unibl.etf.efikas.models.responses;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record OperationalExpenseResponse(
        Long operationalExpenseId,
        Integer categoryId,
        String categoryName,
        String name,
        String description,
        BigDecimal amount,
        LocalDate expenseDate,
        Integer createdBy,
        String authorName,
        String authorSurname,
        Instant createdAt,
        boolean voided,
        Integer voidedBy,
        Instant voidedAt,
        String voidReason
) {
}
