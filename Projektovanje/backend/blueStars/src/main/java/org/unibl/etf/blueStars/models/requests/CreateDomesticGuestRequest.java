package org.unibl.etf.blueStars.models.requests;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Builder;
import lombok.Data;
import org.springframework.validation.annotation.Validated;
import org.unibl.etf.blueStars.models.entities.Apartment;
import org.unibl.etf.blueStars.models.enums.Gender;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
public class CreateDomesticGuestRequest {
    private String name;
    private String surname;
    private Gender gender;
    private LocalDate birthDate;
    private String birthPlace;
    private String birthMunicipality;
    private String birthCountry;
    private String address;
    // Trebalo bi ovo izdvojiti sve u posebnu anotaciju, but no time :/
    @NotNull(message = "JMBG cannot be null")
    @Size(min = 13, max = 13, message = "JMBG must be exactly 13 characters long")
    @Pattern(regexp = "^\\d+$", message = "JMBG must contain only digits")
    private String jmbg;

    private Integer accommodationUnitNumber;
    private Integer accommodationUnitFloor;
    private Instant dateTimeOfArrival;
    private Instant dateTimeOfDeparture;
    private Integer issuedInvoiceNumber;
    private String remarks;
}
