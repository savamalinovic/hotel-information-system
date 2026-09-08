package org.unibl.etf.blueStars.models.requests;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record ApartmentPictureOrderRequest(@NotEmpty List<Long> pictureIds) {
    public ApartmentPictureOrderRequest {
        pictureIds = pictureIds == null ? null : List.copyOf(pictureIds);
    }
}
