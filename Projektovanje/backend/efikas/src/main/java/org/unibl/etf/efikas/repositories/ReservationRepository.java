package org.unibl.etf.efikas.repositories;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.unibl.etf.efikas.models.entities.Reservation;

import java.util.Optional;
import java.util.Collection;
import org.unibl.etf.efikas.models.enums.ReservationStatus;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Integer>, JpaSpecificationExecutor<Reservation> {
    boolean existsByApartmentApartmentIdAndStatusIn(
            Integer apartmentId,
            Collection<ReservationStatus> statuses
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select reservation from Reservation reservation where reservation.reservationId = :reservationId")
    Optional<Reservation> findByIdForUpdate(Integer reservationId);

    @Query("""
            select count(reservation) > 0 from Reservation reservation
            where reservation.apartment.apartmentId = :apartmentId
              and reservation.status in (
                  org.unibl.etf.efikas.models.enums.ReservationStatus.CONFIRMED,
                  org.unibl.etf.efikas.models.enums.ReservationStatus.CHECKED_IN
              )
              and reservation.checkInDate < :checkOutDate
              and reservation.checkOutDate > :checkInDate
            """)
    boolean existsBlocking(Integer apartmentId, java.time.LocalDate checkInDate, java.time.LocalDate checkOutDate);

    @Query("""
            select count(reservation) > 0 from Reservation reservation
            where reservation.apartment.apartmentId = :apartmentId
              and reservation.reservationId <> :excludedId
              and reservation.status in (
                  org.unibl.etf.efikas.models.enums.ReservationStatus.CONFIRMED,
                  org.unibl.etf.efikas.models.enums.ReservationStatus.CHECKED_IN
              )
              and reservation.checkInDate < :checkOutDate
              and reservation.checkOutDate > :checkInDate
            """)
    boolean existsBlockingExcluding(
            Integer apartmentId,
            java.time.LocalDate checkInDate,
            java.time.LocalDate checkOutDate,
            Integer excludedId
    );

    @Query("""
            select count(reservation) > 0 from Reservation reservation
            where reservation.apartment.apartmentId = :apartmentId
              and reservation.status in (
                  org.unibl.etf.efikas.models.enums.ReservationStatus.CONFIRMED,
                  org.unibl.etf.efikas.models.enums.ReservationStatus.CHECKED_IN
              )
              and reservation.checkInDate <= :endDate
              and reservation.checkOutDate > :startDate
            """)
    boolean existsBlockingDuringUnavailability(
            Integer apartmentId,
            java.time.LocalDate startDate,
            java.time.LocalDate endDate
    );
}
