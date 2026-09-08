package org.unibl.etf.blueStars.models.responses;

import java.time.Instant;

public record DamageAttachmentResponse(
        Long damageAttachmentId,
        String originalName,
        String contentType,
        Long sizeBytes,
        Integer uploadedBy,
        Instant uploadedAt,
        String downloadUrl
) {
}
