package org.unibl.etf.efikas.models.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;
import org.unibl.etf.efikas.models.enums.Gender;

import java.time.LocalDate;

public record GuestRequest(
        @NotBlank @Size(max = 30) String citizenId,
        @NotNull Boolean local,
        @Size(max = 500) String personalDocumentUrl,
        @NotBlank @Size(max = 50) String name,
        @NotBlank @Size(max = 50) String surname,
        @NotNull Gender gender,
        @Size(max = 30) String phoneNumber,
        @NotNull @Past LocalDate birthDate,
        @NotBlank @Size(max = 50) String birthPlace,
        @Size(max = 50) String birthMunicipality,
        @NotBlank @Size(max = 50) String birthCountry,
        @NotBlank @Size(max = 100) String address,
        @Size(max = 50) String citizenship,
        @Size(max = 30) String passportNumber,
        LocalDate passportIssuedDate,
        @Size(max = 30) String visaType,
        @Size(max = 30) String visaNumber,
        LocalDate permittedResidenceDate,
        LocalDate entryDate,
        @Size(max = 50) String entryPlace
) {
}
