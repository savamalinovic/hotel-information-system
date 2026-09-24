package org.unibl.etf.blueStars.models.responses;

import org.unibl.etf.blueStars.models.enums.Gender;

import java.time.Instant;
import java.time.LocalDate;

public record GuestResponse(
        Integer guestId,
        String citizenId,
        boolean local,
        String personalDocumentUrl,
        String name,
        String surname,
        Gender gender,
        String phoneNumber,
        LocalDate birthDate,
        String birthPlace,
        String birthMunicipality,
        String birthCountry,
        String address,
        String citizenship,
        String passportNumber,
        LocalDate passportIssuedDate,
        String visaType,
        String visaNumber,
        LocalDate permittedResidenceDate,
        LocalDate entryDate,
        String entryPlace,
        Long version,
        Instant createdAt,
        Instant updatedAt
) {
}
