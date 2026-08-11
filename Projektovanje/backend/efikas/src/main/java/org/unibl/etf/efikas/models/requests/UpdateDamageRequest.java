package org.unibl.etf.efikas.models.requests;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record UpdateDamageRequest(
        @NotBlank @Size(max = 120) String title,
        @NotBlank @Size(max = 2000) String description,
        @DecimalMin("0.01") @Digits(integer = 12, fraction = 2) BigDecimal estimatedAmount,
        @DecimalMin("0.01") @Digits(integer = 12, fraction = 2) BigDecimal confirmedAmount
) {
}
