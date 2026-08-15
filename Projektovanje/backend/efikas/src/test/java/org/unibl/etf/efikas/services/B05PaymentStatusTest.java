package org.unibl.etf.efikas.services;

import org.junit.jupiter.api.Test;
import org.unibl.etf.efikas.models.enums.PaymentStatus;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class B05PaymentStatusTest {
    @Test
    void derivesStatusOnlyFromNetPaidAndTotalDue() {
        BigDecimal total = new BigDecimal("300.00");

        assertThat(PaymentService.deriveStatus(new BigDecimal("0.00"), total))
                .isEqualTo(PaymentStatus.UNPAID);
        assertThat(PaymentService.deriveStatus(new BigDecimal("125.00"), total))
                .isEqualTo(PaymentStatus.PARTIALLY_PAID);
        assertThat(PaymentService.deriveStatus(new BigDecimal("300.00"), total))
                .isEqualTo(PaymentStatus.PAID);
    }
}
