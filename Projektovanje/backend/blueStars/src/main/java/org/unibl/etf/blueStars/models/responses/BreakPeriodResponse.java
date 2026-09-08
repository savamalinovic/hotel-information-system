package org.unibl.etf.blueStars.models.responses;

import java.time.Instant;

public record BreakPeriodResponse(
        Long breakPeriodId,
        Instant startedAt,
        Instant endedAt
) {
}
