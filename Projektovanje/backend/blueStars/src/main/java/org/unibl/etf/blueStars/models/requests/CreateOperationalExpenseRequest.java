package org.unibl.etf.blueStars.models.requests;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateOperationalExpenseRequest(
        @NotNull Integer categoryId,
        @NotBlank @Size(max = 120) String name,
        @Size(max = 1000) String description,
        @NotNull @DecimalMin(value = "0.01") @Digits(integer = 12, fraction = 2) BigDecimal amount,
        @NotNull LocalDate expenseDate
) {
}
