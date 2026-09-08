package org.unibl.etf.blueStars.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.unibl.etf.blueStars.models.entities.ReservationType;

import java.util.Optional;

@Repository
public interface ReservationTypeRepository extends JpaRepository<ReservationType, Long> {
    Optional<ReservationType> findReservationTypeByTypeName(String reservationTypeName);
}
