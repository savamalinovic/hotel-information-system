package org.unibl.etf.blueStars.models.dto;

import lombok.Data;

import java.time.Instant;

@Data
public class ApartmentTaskDTO {
    private String name;
    private String note;
    private Boolean status;
    private Instant dateTime;
}
