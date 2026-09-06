package org.unibl.etf.efikas.services;

import org.junit.jupiter.api.Test;
import org.unibl.etf.efikas.models.enums.WorkerAvailabilityStatus;
import org.unibl.etf.efikas.models.enums.UserRole;

import static org.assertj.core.api.Assertions.assertThat;

class B10WorkerAvailabilityStatusTest {
    @Test
    void derivesCurrentStatusWithStablePrecedence() {
        assertThat(WorkforceAvailabilityService.deriveStatus(false, true, false, false, false))
                .isEqualTo(WorkerAvailabilityStatus.ON_LEAVE);
        assertThat(WorkforceAvailabilityService.deriveStatus(false, false, false, true))
                .isEqualTo(WorkerAvailabilityStatus.OFF_DUTY);
        assertThat(WorkforceAvailabilityService.deriveStatus(true, false, false, false))
                .isEqualTo(WorkerAvailabilityStatus.AVAILABLE);
        assertThat(WorkforceAvailabilityService.deriveStatus(true, false, true, true))
                .isEqualTo(WorkerAvailabilityStatus.ON_BREAK);
        assertThat(WorkforceAvailabilityService.deriveStatus(true, true, true, true))
                .isEqualTo(WorkerAvailabilityStatus.UNAVAILABLE);
        assertThat(WorkforceAvailabilityService.deriveStatus(true, false, false, true))
                .isEqualTo(WorkerAvailabilityStatus.BUSY);
    }

    @Test
    void onlyOperationalWorkersBecomeBusyFromOperationalTasks() {
        assertThat(WorkforceAvailabilityService.isBusyFromOperationalTask(UserRole.AGENT, true)).isFalse();
        assertThat(WorkforceAvailabilityService.isBusyFromOperationalTask(
                UserRole.OPERATIONAL_WORKER, true)).isTrue();
    }
}
