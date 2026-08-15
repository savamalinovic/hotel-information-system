package org.unibl.etf.efikas.models.responses;

import org.unibl.etf.efikas.models.enums.PaymentStatus;

import java.math.BigDecimal;

public record PaymentSummaryResponse(
        Integer reservationId,
        BigDecimal totalDue,
        BigDecimal netPaid,
        BigDecimal outstandingBalance,
        PaymentStatus status
) {
}
