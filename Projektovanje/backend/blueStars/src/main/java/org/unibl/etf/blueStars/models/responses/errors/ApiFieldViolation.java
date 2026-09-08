package org.unibl.etf.blueStars.models.responses.errors;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "One invalid request field.")
public record ApiFieldViolation(
        @Schema(example = "email") String field,
        @Schema(example = "Email must be valid.") String message
) {
}
