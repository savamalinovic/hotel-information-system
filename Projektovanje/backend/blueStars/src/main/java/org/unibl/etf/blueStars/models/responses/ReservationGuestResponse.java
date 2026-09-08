package org.unibl.etf.blueStars.models.responses;

import java.time.Instant;

public record ReservationGuestResponse(
        Long reservationGuestId,
        boolean primaryGuest,
        Integer addedByUserId,
        Instant addedAt,
        GuestResponse guest
) {
}
