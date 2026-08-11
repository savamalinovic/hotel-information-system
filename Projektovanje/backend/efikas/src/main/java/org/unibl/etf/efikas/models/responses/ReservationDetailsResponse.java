package org.unibl.etf.efikas.models.responses;

import org.unibl.etf.efikas.models.enums.ReservationStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record ReservationDetailsResponse(
        Integer reservationId,
        Integer apartmentId,
        String apartmentName,
        LocalDate checkInDate,
        LocalDate checkOutDate,
        long nights,
        Integer guestCount,
        BigDecimal nightlyRate,
        BigDecimal totalPrice,
        String note,
        ReservationStatus status,
        Integer createdByUserId,
        Integer checkInClaimedByUserId,
        Instant checkInClaimedAt,
        Integer checkedInByUserId,
        Instant checkedInAt,
        Long version,
        Instant createdAt,
        Instant updatedAt
) {
}
