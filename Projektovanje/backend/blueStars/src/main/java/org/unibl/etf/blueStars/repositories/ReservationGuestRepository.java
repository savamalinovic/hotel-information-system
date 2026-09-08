package org.unibl.etf.blueStars.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.unibl.etf.blueStars.models.entities.ReservationGuest;

import java.util.List;
import java.util.Optional;

public interface ReservationGuestRepository extends JpaRepository<ReservationGuest, Long> {
    List<ReservationGuest> findByReservationReservationIdOrderByPrimaryGuestDescCreatedAtAsc(Integer reservationId);

    Optional<ReservationGuest> findByReservationReservationIdAndGuestGuestId(Integer reservationId, Integer guestId);

    long countByReservationReservationId(Integer reservationId);

    boolean existsByReservationReservationIdAndPrimaryGuestTrue(Integer reservationId);

    boolean existsByReservationReservationIdAndPrimaryGuestTrueAndGuestGuestIdNot(Integer reservationId, Integer guestId);

    Optional<ReservationGuest> findByReservationReservationIdAndPrimaryGuestTrue(Integer reservationId);
}
