package org.unibl.etf.efikas.models.requests;

import jakarta.validation.Valid;

public record AddReservationGuestRequest(
        Integer existingGuestId,
        @Valid GuestRequest guest,
        boolean primaryGuest
) {
}
