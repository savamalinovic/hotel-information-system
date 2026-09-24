package org.unibl.etf.blueStars.models.requests;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Password login credentials.")
public record LoginRequest(
        @NotBlank(message = "Email is required.")
        @Email(message = "Email must be valid.")
        @Size(max = 50, message = "Email must contain at most 50 characters.")
        @Schema(example = "agent@example.com") String email,

        @NotBlank(message = "Password is required.")
        @Size(min = 8, max = 128, message = "Password must contain between 8 and 128 characters.")
        @Schema(format = "password", minLength = 8, maxLength = 128) String password
) {
}
