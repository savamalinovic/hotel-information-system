package org.unibl.etf.blueStars.models.responses;

import org.unibl.etf.blueStars.models.enums.ApartmentEffectiveStatus;
import org.unibl.etf.blueStars.models.enums.ApartmentOperationalStatus;

import java.time.Instant;
import java.util.List;

public record ApartmentDetailsResponse(
        Integer apartmentId,
        String name,
        String address,
        Integer floor,
        ApartmentTypeResponse type,
        ApartmentOperationalStatus operationalStatus,
        ApartmentEffectiveStatus effectiveStatus,
        boolean active,
        Long version,
        Instant createdAt,
        Instant updatedAt,
        List<ApartmentPictureResponse> pictures
) {
    public ApartmentDetailsResponse {
        pictures = List.copyOf(pictures);
    }
}
