package org.unibl.etf.efikas.models.requests;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.unibl.etf.efikas.models.enums.UserRole;

@Schema(description = "Manager-controlled user identity and role update.")
public record UpdateManagedUserRequest(
        @NotBlank @Email @Size(max = 50) String email,
        @NotBlank @Size(min = 2, max = 50) String name,
        @NotBlank @Size(min = 2, max = 50) String surname,
        @NotBlank @Pattern(regexp = "\\d{13}", message = "JMBG must contain exactly 13 digits.") String jmbg,
        @NotBlank @Size(min = 5, max = 50) String address,
        @Size(max = 30) @Pattern(regexp = "^$|^\\+?[0-9 ()/\\-]{7,30}$", message = "Phone number format is invalid.") String phoneNumber,
        @NotNull UserRole role
) {
}
