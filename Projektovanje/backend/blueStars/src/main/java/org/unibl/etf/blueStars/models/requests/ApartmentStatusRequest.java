package org.unibl.etf.blueStars.models.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.unibl.etf.blueStars.models.enums.ApartmentOperationalStatus;

public record ApartmentStatusRequest(
        @NotNull ApartmentOperationalStatus status,
        @NotBlank @Size(max = 300) String reason
) {
}
