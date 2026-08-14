package org.unibl.etf.efikas.models.responses;

import java.time.Instant;

public record ApartmentPictureResponse(
        Long pictureId,
        String url,
        Integer displayOrder,
        Instant createdAt
) {
}
