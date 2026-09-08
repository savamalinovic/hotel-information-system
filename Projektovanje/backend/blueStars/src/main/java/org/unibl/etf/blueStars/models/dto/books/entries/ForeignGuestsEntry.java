package org.unibl.etf.blueStars.models.dto.books.entries;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.unibl.etf.blueStars.models.enums.Gender;
import org.unibl.etf.blueStars.models.responses.ApartmentResponse;

import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ForeignGuestsEntry {
    private Integer id;
    private String citizenId;
    private String name;
    private String surname;
    private Gender gender;
    private LocalDate birthDate;
    private String birthPlace;
    private String birthCountry;
    private String address;
    private String citizenship;
    private String passportNumber;
    private LocalDate passportIssuedDate;
    private String visaType;
    private String visaNumber;
    @Builder.Default
    private LocalDate permittedResidenceDate = LocalDate.now();     // TODO: popuniti u bazi
    private LocalDate entryDate;
    private String entryPlace;
    private Integer accommodationUnitNumber;
    private Integer accommodationUnitFloor;
    private Instant dateTimeOfArrival;
    private Instant dateTimeOfDeparture;
    private String issuedInvoiceNumber;
    private String remarks;
}
