package org.unibl.etf.efikas.models.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record CreateAvailabilityOverrideRequest(
        Instant startsAt,
        Instant endsAt,
        @NotBlank @Size(max = 300) String reason
) {
}
