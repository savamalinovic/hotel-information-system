package org.unibl.etf.efikas.models.responses.errors;

import java.time.Instant;
import java.util.List;

public record ApiErrorResponse(
        Instant timestamp,
        int status,
        ApiErrorCode code,
        String message,
        String path,
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
