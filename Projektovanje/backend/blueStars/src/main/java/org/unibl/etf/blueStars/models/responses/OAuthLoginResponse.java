package org.unibl.etf.blueStars.models.responses;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Successful OAuth authentication result.")
public record OAuthLoginResponse(
        @Schema(description = "JWT bearer token issued by BlueStars.") String accessToken
) {
}
