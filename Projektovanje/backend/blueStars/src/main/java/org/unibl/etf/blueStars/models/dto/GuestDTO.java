package org.unibl.etf.blueStars.models.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import org.unibl.etf.blueStars.models.enums.Gender;

import java.time.Instant;
import java.time.LocalDate;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@JsonTypeInfo(
        use = JsonTypeInfo.Id.NAME,
        include = JsonTypeInfo.As.EXISTING_PROPERTY,
        property = "isLocal",
        visible = true  // This makes the property visible after deserialization
)
@JsonSubTypes({
        @JsonSubTypes.Type(value = DomesticGuestDTO.class, name = "true"),
        @JsonSubTypes.Type(value = ForeignGuestDTO.class, name = "false")
})
public class GuestDTO {
    private Integer id;
    private String citizenId;
    private Boolean isLocal;
    private String personalDocumentURL;
    private String name;
    private String surname;
    private Gender gender;
    private String phoneNumber;
    private LocalDate birthDate;
    private String birthPlace;

    private String birthCountry;
    private String address;

    private Integer accommodationUnitNumber;
    private Integer accommodationUnitFloor;
    private Instant dateTimeOfArrival;
    private Instant dateTimeOfDeparture;

    @JsonProperty(required = false)
    private String issuedInvoiceNumber;
    private String remarks;
    private Instant createdAt;
}
