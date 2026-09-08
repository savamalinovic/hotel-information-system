package org.unibl.etf.blueStars.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.unibl.etf.blueStars.models.entities.ReservationCheckInClaimHistory;

import java.util.List;

public interface ReservationCheckInClaimHistoryRepository
        extends JpaRepository<ReservationCheckInClaimHistory, Long> {
    List<ReservationCheckInClaimHistory>
    findByReservationReservationIdOrderByPerformedAtDescReservationCheckInClaimHistoryIdDesc(Integer reservationId);
}
