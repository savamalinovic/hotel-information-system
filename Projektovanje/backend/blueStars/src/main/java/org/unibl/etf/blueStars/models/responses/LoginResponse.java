package org.unibl.etf.blueStars.models.responses;

import io.swagger.v3.oas.annotations.media.Schema;
import org.unibl.etf.blueStars.models.enums.UserRole;

@Schema(description = "Successful password authentication result.")
public record LoginResponse(
        @Schema(example = "agent@example.com") String email,
        @Schema(example = "AGENT") UserRole role,
        @Schema(description = "JWT bearer token returned only after successful authentication.") String token
) {
}
