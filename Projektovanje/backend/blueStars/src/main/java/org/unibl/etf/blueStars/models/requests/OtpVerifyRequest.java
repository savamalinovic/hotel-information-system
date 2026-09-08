package org.unibl.etf.blueStars.models.requests;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(description = "OTP verification request.")
public class OtpVerifyRequest {
    @NotBlank(message = "Email is required.")
    @Email(message = "Email must be valid.")
    @Size(max = 50, message = "Email must contain at most 50 characters.")
    @Schema(example = "agent@example.com")
    private String email;

    @NotBlank(message = "OTP is required.")
    @Pattern(regexp = "\\d{6}", message = "OTP must contain exactly 6 digits.")
    @Schema(example = "123456", pattern = "\\d{6}")
    private String otp;
}
