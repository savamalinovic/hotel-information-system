package org.unibl.etf.blueStars.models.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateExpenseCategoryRequest(
        @NotBlank @Size(max = 80) String name,
        @Size(max = 300) String description,
        @NotNull Boolean active
) {
}
