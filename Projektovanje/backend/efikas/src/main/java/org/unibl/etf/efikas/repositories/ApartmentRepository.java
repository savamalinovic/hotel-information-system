package org.unibl.etf.efikas.repositories;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import org.unibl.etf.efikas.models.entities.Apartment;

import java.util.Optional;
import java.time.LocalDate;

@Repository
public interface ApartmentRepository extends JpaRepository<Apartment, Integer>, JpaSpecificationExecutor<Apartment> {
    boolean existsByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndApartmentIdNot(String name, Integer apartmentId);
    boolean existsByTypeApartmentTypeIdAndActiveTrue(Integer apartmentTypeId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Apartment a where a.apartmentId = :apartmentId")
    Optional<Apartment> findByIdForUpdate(Integer apartmentId);

    @Query("""
            select apartment from Apartment apartment
            where apartment.active = true
              and apartment.type.active = true
              and apartment.type.capacity >= :guestCount
              and (:apartmentTypeId is null or apartment.type.apartmentTypeId = :apartmentTypeId)
              and not exists (
                  select reservation.reservationId from Reservation reservation
                  where reservation.apartment = apartment
                    and reservation.status in (
                        org.unibl.etf.efikas.models.enums.ReservationStatus.CONFIRMED,
                        org.unibl.etf.efikas.models.enums.ReservationStatus.CHECKED_IN
                    )
                    and reservation.checkInDate < :checkOutDate
                    and reservation.checkOutDate > :checkInDate
              )
              and not exists (
                  select period.apartmentUnavailabilityId from ApartmentUnavailability period
                  where period.apartment = apartment
                    and period.startDate < :checkOutDate
                    and period.endDate >= :checkInDate
              )
            """)
    Page<Apartment> findAvailable(
            @Param("checkInDate") LocalDate checkInDate,
            @Param("checkOutDate") LocalDate checkOutDate,
            @Param("guestCount") Integer guestCount,
            @Param("apartmentTypeId") Integer apartmentTypeId,
            Pageable pageable
    );
}
