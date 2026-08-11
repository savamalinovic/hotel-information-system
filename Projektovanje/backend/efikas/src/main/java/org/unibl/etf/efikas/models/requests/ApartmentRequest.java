package org.unibl.etf.efikas.models.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ApartmentRequest(
        @NotBlank @Size(max = 50) String name,
        @NotBlank @Size(max = 100) String address,
        Integer floor,
        @NotNull Integer apartmentTypeId
) {
}
