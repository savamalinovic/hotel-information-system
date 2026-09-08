package org.unibl.etf.blueStars.models.dto;

import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;

@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class ForeignGuestDTO extends GuestDTO {
    private String citizenship;
    private String passportNumber;
    private LocalDate passportIssuedDate;
    private String visaType;
    private String visaNumber;
    private LocalDate permittedResidenceDate;
    private LocalDate entryDate;
    private String entryPlace;
}
