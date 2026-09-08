package org.unibl.etf.blueStars.models.responses;

import lombok.Data;

@Data
public class ApartmentDamageResponse {
    private Long apartmentId;
    private String name;
    private Double damagePrice;
    private String note;
    private Boolean status;
}
