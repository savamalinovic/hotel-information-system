package org.unibl.etf.efikas.models.requests;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Google identity token used to start an eFikas session.")
public record OAuthLoginRequest(
        @NotBlank(message = "OAuth token is required.")
        @Size(max = 4096, message = "OAuth token is too long.")
        @Schema(description = "Google identity token.", maxLength = 4096) String token
) {
}
