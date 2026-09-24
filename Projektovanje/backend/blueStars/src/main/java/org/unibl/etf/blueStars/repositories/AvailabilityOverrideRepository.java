package org.unibl.etf.blueStars.repositories;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.unibl.etf.blueStars.models.entities.AvailabilityOverride;

import java.time.Instant;
import java.util.Optional;

public interface AvailabilityOverrideRepository extends JpaRepository<AvailabilityOverride, Long> {
    @Query("""
            select override from AvailabilityOverride override
            where override.worker.userId = :workerId
              and override.clearedAt is null
              and override.startsAt <= :at
              and (override.endsAt is null or override.endsAt > :at)
            order by override.startsAt desc, override.availabilityOverrideId desc
            """)
    Optional<AvailabilityOverride> findCurrent(Integer workerId, Instant at);

    @Query("""
            select count(override) > 0 from AvailabilityOverride override
            where override.worker.userId = :workerId
              and override.clearedAt is null
              and override.startsAt < :endsAt
              and (override.endsAt is null or override.endsAt > :startsAt)
            """)
    boolean existsOverlappingBounded(Integer workerId, Instant startsAt, Instant endsAt);

    @Query("""
            select count(override) > 0 from AvailabilityOverride override
            where override.worker.userId = :workerId
              and override.clearedAt is null
              and (override.endsAt is null or override.endsAt > :startsAt)
            """)
    boolean existsOverlappingOpenEnded(Integer workerId, Instant startsAt);

    Optional<AvailabilityOverride> findByAvailabilityOverrideIdAndWorkerUserId(Long overrideId, Integer workerId);

    Page<AvailabilityOverride> findByWorkerUserIdOrderByStartsAtDescAvailabilityOverrideIdDesc(
            Integer workerId, Pageable pageable);
}
