package org.unibl.etf.efikas.services;

import org.junit.jupiter.api.Test;
import org.unibl.etf.efikas.models.enums.WorkerAvailabilityStatus;

import static org.assertj.core.api.Assertions.assertThat;

class B10WorkerAvailabilityStatusTest {
    @Test
    void derivesCurrentStatusWithStablePrecedence() {
        assertThat(WorkforceAvailabilityService.deriveStatus(false, false, false))
                .isEqualTo(WorkerAvailabilityStatus.OFF_DUTY);
        assertThat(WorkforceAvailabilityService.deriveStatus(true, false, false))
                .isEqualTo(WorkerAvailabilityStatus.AVAILABLE);
        assertThat(WorkforceAvailabilityService.deriveStatus(true, false, true))
                .isEqualTo(WorkerAvailabilityStatus.ON_BREAK);
        assertThat(WorkforceAvailabilityService.deriveStatus(true, true, true))
                .isEqualTo(WorkerAvailabilityStatus.UNAVAILABLE);
    }
}
