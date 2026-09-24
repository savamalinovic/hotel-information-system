package org.unibl.etf.blueStars.models.responses;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record DemoReceiptResponse(
        Long demoReceiptId,
        Integer reservationId,
        String receiptNumber,
        Instant issuedAt,
        Integer issuedByUserId,
        String hotelName,
        String hotelAddress,
        String hotelTaxId,
        String apartmentName,
        String primaryGuestName,
        LocalDate checkInDate,
        LocalDate checkOutDate,
        Integer nights,
        BigDecimal nightlyRate,
        BigDecimal totalAmount,
        BigDecimal vatAmount,
        String currency,
        String pdfSha256,
        String pdfDownloadPath
) {
}
