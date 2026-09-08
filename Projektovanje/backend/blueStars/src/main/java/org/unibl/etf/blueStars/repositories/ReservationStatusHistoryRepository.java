package org.unibl.etf.blueStars.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.unibl.etf.blueStars.models.entities.ReservationStatusHistory;

import java.util.List;

@Repository
public interface ReservationStatusHistoryRepository extends JpaRepository<ReservationStatusHistory, Long> {
    List<ReservationStatusHistory> findByReservationReservationIdOrderByChangedAtDescReservationStatusHistoryIdDesc(
            Integer reservationId
    );
}
