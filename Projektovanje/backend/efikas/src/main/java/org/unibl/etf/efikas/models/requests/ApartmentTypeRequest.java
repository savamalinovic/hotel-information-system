package org.unibl.etf.efikas.models.requests;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record ApartmentTypeRequest(
        @NotBlank @Size(max = 80) String name,
        @Size(max = 500) String description,
        @NotNull @Positive Integer capacity,
        @NotNull @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal defaultNightlyRate
) {
}
