package org.unibl.etf.blueStars.models.responses;

import org.unibl.etf.blueStars.models.enums.PaymentStatus;

import java.math.BigDecimal;

public record PaymentSummaryResponse(
        Integer reservationId,
        BigDecimal totalDue,
        BigDecimal netPaid,
        BigDecimal outstandingBalance,
        PaymentStatus status
) {
}
