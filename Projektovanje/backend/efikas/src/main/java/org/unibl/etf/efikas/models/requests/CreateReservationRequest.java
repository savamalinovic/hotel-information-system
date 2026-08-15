package org.unibl.etf.efikas.models.requests;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateReservationRequest(
        @NotNull Integer apartmentId,
        @NotNull @FutureOrPresent LocalDate checkInDate,
        @NotNull @Future LocalDate checkOutDate,
        @NotNull @Positive Integer guestCount,
        @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal nightlyRate,
        @Size(max = 256) String note
) {
}
