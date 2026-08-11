package org.unibl.etf.efikas.models.responses.errors;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;

@Schema(description = "Stable error envelope returned by MVC and Spring Security.")
public record ApiErrorResponse(
        @Schema(example = "2026-08-11T13:42:01.170Z") Instant timestamp,
        @Schema(example = "400") int status,
        @Schema(example = "VALIDATION_FAILED") ApiErrorCode code,
        @Schema(example = "One or more request fields are invalid.") String message,
        @Schema(example = "/api/v1/auth/login") String path,
        @Schema(description = "Field violations; always present and empty for non-validation errors.")
        List<ApiFieldViolation> violations
) {
    public ApiErrorResponse {
        violations = violations == null ? List.of() : List.copyOf(violations);
    }

    public static ApiErrorResponse of(
            int status,
            ApiErrorCode code,
            String message,
            String path
    ) {
        return new ApiErrorResponse(Instant.now(), status, code, message, path, List.of());
    }

    public static ApiErrorResponse validation(
            int status,
            String message,
            String path,
            List<ApiFieldViolation> violations
    ) {
        return new ApiErrorResponse(
                Instant.now(), status, ApiErrorCode.VALIDATION_FAILED, message, path, violations);
    }
}
