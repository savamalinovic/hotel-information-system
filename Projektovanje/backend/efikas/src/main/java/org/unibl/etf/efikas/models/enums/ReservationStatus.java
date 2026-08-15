package org.unibl.etf.efikas.models.enums;

public enum ReservationStatus {
    CONFIRMED,
    CHECKED_IN,
    CHECKED_OUT,
    CANCELLED,
    NO_SHOW;

    public boolean blocksAvailability() {
        return this == CONFIRMED || this == CHECKED_IN;
    }
}
