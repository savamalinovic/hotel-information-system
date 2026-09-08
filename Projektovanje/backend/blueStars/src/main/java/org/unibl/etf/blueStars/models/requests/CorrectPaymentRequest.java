package org.unibl.etf.blueStars.models.requests;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CorrectPaymentRequest(
        @NotNull @Digits(integer = 10, fraction = 2) BigDecimal amount,
        @NotBlank @Size(max = 300) String reason
) {
}
