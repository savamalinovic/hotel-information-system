package org.unibl.etf.efikas.models.requests;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record ApartmentPictureOrderRequest(@NotEmpty List<Long> pictureIds) {
    public ApartmentPictureOrderRequest {
        pictureIds = pictureIds == null ? null : List.copyOf(pictureIds);
    }
}
