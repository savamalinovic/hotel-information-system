package org.unibl.etf.blueStars.models.responses;

import org.unibl.etf.blueStars.models.enums.ApartmentOperationalStatus;
import org.unibl.etf.blueStars.models.enums.ReservationStatus;

import java.time.Instant;

public record CheckOutResponse(
        Integer reservationId,
        ReservationStatus reservationStatus,
        Integer apartmentId,
        ApartmentOperationalStatus apartmentStatus,
        Integer checkedOutByUserId,
        Instant checkedOutAt,
        Long cleaningTaskId
) {
}
