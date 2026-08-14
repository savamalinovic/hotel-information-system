package org.unibl.etf.efikas.models.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Objects;

@Data
@Schema(description = "Password reset request confirmed by a six-digit OTP.")
public class ChangePasswordDTO {
    @NotBlank(message = "Email is required.")
    @Email(message = "Email must be valid.")
    @Size(max = 50, message = "Email must contain at most 50 characters.")
    @Schema(example = "agent@example.com")
    private String email;

    @NotBlank(message = "New password is required.")
    @Size(min = 8, max = 128, message = "New password must contain between 8 and 128 characters.")
    @Schema(format = "password", minLength = 8, maxLength = 128)
    private String newPassword;

    @NotBlank(message = "Password confirmation is required.")
    @Size(min = 8, max = 128, message = "Password confirmation must contain between 8 and 128 characters.")
    @Schema(format = "password", minLength = 8, maxLength = 128)
    private String confirmPassword;

    @NotBlank(message = "OTP is required.")
    @Pattern(regexp = "\\d{6}", message = "OTP must contain exactly 6 digits.")
    @Schema(example = "123456", pattern = "\\d{6}")
    private String otp;

    @JsonIgnore
    @AssertTrue(message = "Passwords must match.")
    public boolean isPasswordConfirmed() {
        return Objects.equals(newPassword, confirmPassword);
    }
}
