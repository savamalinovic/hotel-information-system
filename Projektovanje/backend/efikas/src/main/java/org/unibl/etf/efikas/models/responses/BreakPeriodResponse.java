package org.unibl.etf.efikas.models.responses;

import java.time.Instant;

public record BreakPeriodResponse(
        Long breakPeriodId,
        Instant startedAt,
        Instant endedAt
) {
}
