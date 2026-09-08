package org.unibl.etf.blueStars.models.responses;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record IncomeBookEntryResponse(
        Long incomeBookEntryId,
        Integer reservationId,
        String receiptNumber,
        LocalDate accountingDate,
        String description,
        BigDecimal serviceSaleRevenue,
        BigDecimal totalRevenue,
        BigDecimal vatAmount,
        Instant createdAt
) {
}
