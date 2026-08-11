package org.unibl.etf.efikas.models.responses;

import java.time.Instant;

public record CheckInResponse(
        ReservationDetailsResponse reservation,
        int guestBookEntriesCreated,
        Integer checkedInByUserId,
        Instant checkedInAt
) {
}
