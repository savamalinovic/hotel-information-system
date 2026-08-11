package org.unibl.etf.efikas.models.responses;

import java.time.Instant;

public record ReservationGuestResponse(
        Long reservationGuestId,
        boolean primaryGuest,
        Integer addedByUserId,
        Instant addedAt,
        GuestResponse guest
) {
}
