package org.unibl.etf.blueStars.services;

import org.junit.jupiter.api.Test;
import org.unibl.etf.blueStars.models.enums.Gender;
import org.unibl.etf.blueStars.models.requests.GuestRequest;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class B04GuestValidationTest {

    @Test
    void domesticGuestRequiresBirthMunicipality() {
        GuestRequest request = base(true, null, null, null, null);

        assertThatThrownBy(() -> GuestService.validateGuest(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("municipality");
    }

    @Test
    void completeForeignGuestIsAccepted() {
        GuestRequest request = base(
                false, "Germany", "PASS-123", LocalDate.of(2020, 1, 1), LocalDate.now());

        assertThatNoException().isThrownBy(() -> GuestService.validateGuest(request));
    }

    private static GuestRequest base(
            boolean local,
            String citizenship,
            String passportNumber,
            LocalDate passportIssuedDate,
            LocalDate entryDate
    ) {
        return new GuestRequest(
                "B04-VALIDATION", local, null, "Test", "Guest", Gender.Male, null,
                LocalDate.of(1990, 1, 1), "Birth place", local ? null : null,
                "Birth country", "Address", citizenship, passportNumber, passportIssuedDate,
                null, null, null, entryDate, local ? null : "Entry place");
    }
}
