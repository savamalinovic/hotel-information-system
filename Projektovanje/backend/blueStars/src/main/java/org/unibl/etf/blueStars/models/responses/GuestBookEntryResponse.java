package org.unibl.etf.blueStars.models.responses;

import org.unibl.etf.blueStars.models.enums.Gender;
import org.unibl.etf.blueStars.models.enums.GuestBookType;

import java.time.Instant;
import java.time.LocalDate;

public record GuestBookEntryResponse(
        Long guestBookEntryId,
        Integer reservationId,
        Integer guestId,
        GuestBookType bookType,
        String citizenId,
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
        Integer apartmentId,
        String apartmentName,
        Integer apartmentFloor,
        Instant arrivedAt,
        LocalDate plannedDepartureDate,
        Integer checkedInByUserId,
        Instant createdAt
) {
}
