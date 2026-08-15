package org.unibl.etf.efikas.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.unibl.etf.efikas.models.entities.BreakPeriod;

import java.util.List;
import java.util.Optional;

public interface BreakPeriodRepository extends JpaRepository<BreakPeriod, Long> {
    Optional<BreakPeriod> findByAttendanceSessionAttendanceSessionIdAndEndedAtIsNull(Long attendanceSessionId);

    List<BreakPeriod> findByAttendanceSessionAttendanceSessionIdOrderByStartedAtAscBreakPeriodIdAsc(
            Long attendanceSessionId);
}
