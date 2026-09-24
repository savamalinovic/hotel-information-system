package org.unibl.etf.blueStars.models.requests;

import lombok.Builder;
import lombok.Data;
import org.unibl.etf.blueStars.models.enums.Gender;
import org.unibl.etf.blueStars.models.responses.ApartmentResponse;

import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
public class CreateForeignGuestRequest {
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
    private LocalDate permittedResidenceDate;
    private LocalDate entryDate;
    private String entryPlace;
    private Integer accommodationUnitNumber;
    private Integer accommodationUnitFloor;
    private Instant dateTimeOfArrival;
    private Instant dateTimeOfDeparture;
    private Integer issuedInvoiceNumber;
    private String remarks;
}
