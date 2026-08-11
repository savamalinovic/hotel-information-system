package org.unibl.etf.efikas.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.unibl.etf.efikas.models.entities.Reservation;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Integer> {
    Optional<Reservation> findReservationByReservationId(Integer reservationId);
    List<Reservation> findReservationByApartmentApartmentId(Integer apartmentId);
}
