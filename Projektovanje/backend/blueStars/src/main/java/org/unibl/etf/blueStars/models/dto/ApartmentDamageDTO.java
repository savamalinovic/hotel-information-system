package org.unibl.etf.blueStars.models.dto;

import lombok.Data;

@Data
public class ApartmentDamageDTO {
    private String name;
    private Double damagePrice;
    private String note;
    private Boolean status;
}
