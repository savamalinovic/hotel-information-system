package org.unibl.etf.blueStars.services;

import java.time.LocalDate;
import java.time.ZoneId;

final class WorkforceCalendar {
    private static final ZoneId HOTEL_TIME_ZONE = ZoneId.of("Europe/Sarajevo");

    private WorkforceCalendar() { }

    static LocalDate today() {
        return LocalDate.now(HOTEL_TIME_ZONE);
    }
}
