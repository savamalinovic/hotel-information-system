package org.unibl.etf.efikas.models.responses;

import io.swagger.v3.oas.annotations.media.Schema;
import org.unibl.etf.efikas.models.enums.UserRole;

@Schema(description = "Successful password authentication result.")
public record LoginResponse(
        @Schema(example = "agent@example.com") String email,
        @Schema(example = "AGENT") UserRole role,
        @Schema(description = "JWT bearer token returned only after successful authentication.") String token
) {
}
