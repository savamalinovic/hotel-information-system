package org.unibl.etf.efikas.models.requests;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record UpdateReservationStayRequest(@NotNull LocalDate checkOutDate) {
}
