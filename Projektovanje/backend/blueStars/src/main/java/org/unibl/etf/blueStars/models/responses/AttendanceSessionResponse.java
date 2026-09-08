package org.unibl.etf.blueStars.models.responses;

import java.time.Instant;
import java.util.List;

public record AttendanceSessionResponse(
        Long attendanceSessionId,
        Integer workerId,
        Instant clockedInAt,
        Instant clockedOutAt,
        List<BreakPeriodResponse> breaks
) {
}
