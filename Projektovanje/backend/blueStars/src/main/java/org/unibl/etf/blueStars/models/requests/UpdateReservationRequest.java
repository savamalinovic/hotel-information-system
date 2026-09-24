package org.unibl.etf.blueStars.models.requests;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.unibl.etf.blueStars.models.dto.GuestDTO;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateReservationRequest {
    private Integer apartmentId;
    private GuestDTO guest;
    private Integer guestQuantity;
    private Double price;
    private String note;
    private String reservationType;
}
