package org.unibl.etf.efikas.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.unibl.etf.efikas.models.entities.ReservationCheckInClaimHistory;

import java.util.List;

public interface ReservationCheckInClaimHistoryRepository
        extends JpaRepository<ReservationCheckInClaimHistory, Long> {
    List<ReservationCheckInClaimHistory>
    findByReservationReservationIdOrderByPerformedAtDescReservationCheckInClaimHistoryIdDesc(Integer reservationId);
}
