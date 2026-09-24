package org.unibl.etf.blueStars.models.requests;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record UpdateReservationStayRequest(@NotNull LocalDate checkOutDate) {
}
