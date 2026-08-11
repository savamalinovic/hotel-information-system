package org.unibl.etf.efikas.models.requests;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Objects;

@Data
public class RegistrationRequest {
    @NotBlank(message = "Email is required.")
    @Email(message = "Email must be valid.")
    @Size(max = 50, message = "Email must contain at most 50 characters.")
    private String email;

    @NotBlank(message = "Password is required.")
    @Size(min = 8, max = 128, message = "Password must contain between 8 and 128 characters.")
    private String password;

    @NotBlank(message = "Password confirmation is required.")
    @Size(min = 8, max = 128, message = "Password confirmation must contain between 8 and 128 characters.")
    private String repeatPassword;

    @NotBlank(message = "Name is required.")
    @Size(min = 2, max = 50, message = "Name must contain between 2 and 50 characters.")
    private String name;

    @NotBlank(message = "Surname is required.")
    @Size(min = 2, max = 50, message = "Surname must contain between 2 and 50 characters.")
    private String surname;

    @NotBlank(message = "JMBG is required.")
    @Pattern(regexp = "\\d{13}", message = "JMBG must contain exactly 13 digits.")
    private String jmbg;

    @NotBlank(message = "Address is required.")
    @Size(min = 5, max = 50, message = "Address must contain between 5 and 50 characters.")
    private String address;

    @Size(max = 30, message = "Phone number must contain at most 30 characters.")
    private String phoneNumber;

    @JsonIgnore
    @AssertTrue(message = "Passwords must match.")
    public boolean isPasswordConfirmed() {
        return Objects.equals(password, repeatPassword);
    }
}
