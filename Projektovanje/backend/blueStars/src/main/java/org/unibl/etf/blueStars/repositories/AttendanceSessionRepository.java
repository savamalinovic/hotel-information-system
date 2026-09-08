package org.unibl.etf.blueStars.repositories;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.unibl.etf.blueStars.models.entities.AttendanceSession;

import java.util.Optional;

public interface AttendanceSessionRepository extends JpaRepository<AttendanceSession, Long> {
    Optional<AttendanceSession> findByWorkerUserIdAndClockedOutAtIsNull(Integer workerId);

    Page<AttendanceSession> findByWorkerUserIdOrderByClockedInAtDescAttendanceSessionIdDesc(
            Integer workerId, Pageable pageable);

    boolean existsByWorkerUserIdAndClockedOutAtIsNull(Integer workerId);
}
