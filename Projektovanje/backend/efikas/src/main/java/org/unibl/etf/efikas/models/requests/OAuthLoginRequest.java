package org.unibl.etf.efikas.models.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OAuthLoginRequest(
        @NotBlank(message = "OAuth token is required.")
        @Size(max = 4096, message = "OAuth token is too long.")
        String token
) {
}
