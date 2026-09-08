package org.unibl.etf.blueStars.models.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateExpenseCategoryRequest(
        @NotBlank @Size(max = 80) String name,
        @Size(max = 300) String description
) {
}
