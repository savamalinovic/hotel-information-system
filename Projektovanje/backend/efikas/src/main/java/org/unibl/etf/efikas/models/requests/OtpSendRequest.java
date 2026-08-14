package org.unibl.etf.efikas.models.requests;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(description = "Request for a password-recovery OTP.")
public class OtpSendRequest {
    @NotBlank(message = "Email is required.")
    @Email(message = "Email must be valid.")
    @Size(max = 50, message = "Email must contain at most 50 characters.")
    @Schema(example = "agent@example.com")
    private String email;
}
