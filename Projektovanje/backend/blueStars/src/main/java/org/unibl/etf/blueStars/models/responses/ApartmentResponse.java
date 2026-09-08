package org.unibl.etf.blueStars.models.responses;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class ApartmentResponse {
    private Integer apartmentId;
    private String name;
    private String address;
    private Integer numberOfBeds;
    private Integer numberOfRooms;
    private Integer capacity;
    private Double pricePerDay;
    private Double pricePerNight;
    private List<String> pictures;          // picture URLs
    private Map<String, Boolean> traits;
}
