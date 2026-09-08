package org.unibl.etf.blueStars.models.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReservationDTO {
    private Integer apartmentId;
    private GuestDTO guest;
    private Integer guestQuantity;
    private Double price;
    private String note;
    private String reservationType;
}
