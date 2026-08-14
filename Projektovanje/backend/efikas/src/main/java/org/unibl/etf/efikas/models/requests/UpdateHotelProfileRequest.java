package org.unibl.etf.efikas.models.requests;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateHotelProfileRequest(
        @NotBlank @Size(max = 100) String name,
        @Size(max = 150) String legalName,
        @Size(max = 150) String address,
        @Size(max = 80) String city,
        @Pattern(regexp = "^[A-Za-z]{2}$", message = "Country code must contain two letters.") String countryCode,
        @Size(max = 30) @Pattern(regexp = "^$|^\\+?[0-9 ()/\\-]{7,30}$", message = "Phone number format is invalid.") String phoneNumber,
        @Email @Size(max = 100) String email,
        @Size(max = 32) String taxId
) {
}
