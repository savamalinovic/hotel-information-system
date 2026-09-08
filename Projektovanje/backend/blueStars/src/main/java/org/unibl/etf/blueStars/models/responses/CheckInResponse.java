package org.unibl.etf.blueStars.models.responses;

import java.time.Instant;

public record CheckInResponse(
        ReservationDetailsResponse reservation,
        int guestBookEntriesCreated,
        Integer checkedInByUserId,
        Instant checkedInAt
) {
}
