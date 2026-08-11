package org.unibl.etf.efikas.models.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.unibl.etf.efikas.models.enums.ReservationStatus;

public record ChangeReservationStatusRequest(
        @NotNull ReservationStatus status,
        @NotBlank @Size(max = 300) String reason
) {
}
