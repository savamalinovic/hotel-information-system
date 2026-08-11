package org.unibl.etf.efikas.models.responses;

import org.unibl.etf.efikas.models.enums.PaymentType;

import java.math.BigDecimal;
import java.time.Instant;

public record PaymentResponse(
        Long paymentId,
        Integer reservationId,
        PaymentType type,
        BigDecimal amount,
        Long referencedPaymentId,
        String reference,
        String reason,
        Integer recordedByUserId,
        Instant recordedAt
) {
}
