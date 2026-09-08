package org.unibl.etf.blueStars.models.dto.books.entries;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.unibl.etf.blueStars.models.enums.Gender;

import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DomesticGuestsEntry {
    private Integer id;
    private String citizenId;
    private String name;
    private String surname;
    private Gender gender;
    private LocalDate birthDate;
    private String birthPlace;
    private String birthMunicipality;
    private String birthCountry;
    private String address;
    private Integer accommodationUnitNumber;
    private Integer accommodationUnitFloor;
    private Instant dateTimeOfArrival;
    private Instant dateTimeOfDeparture;
    private String issuedInvoiceNumber;
    private String remarks;

}
