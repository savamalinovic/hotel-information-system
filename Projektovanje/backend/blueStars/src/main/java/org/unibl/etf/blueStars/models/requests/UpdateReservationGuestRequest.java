package org.unibl.etf.blueStars.models.requests;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record UpdateReservationGuestRequest(
        @NotNull @Valid GuestRequest guest,
        @NotNull Boolean primaryGuest
) {
}
