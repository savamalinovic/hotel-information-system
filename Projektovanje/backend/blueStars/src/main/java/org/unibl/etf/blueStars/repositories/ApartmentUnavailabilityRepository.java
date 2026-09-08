package org.unibl.etf.blueStars.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.unibl.etf.blueStars.models.entities.ApartmentUnavailability;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ApartmentUnavailabilityRepository extends JpaRepository<ApartmentUnavailability, Long> {
    List<ApartmentUnavailability> findByApartmentApartmentIdOrderByStartDateAscApartmentUnavailabilityIdAsc(Integer apartmentId);
    Optional<ApartmentUnavailability> findByApartmentUnavailabilityIdAndApartmentApartmentId(Long id, Integer apartmentId);

    @Query("""
            select count(u) > 0 from ApartmentUnavailability u
            where u.apartment.apartmentId = :apartmentId
              and u.startDate <= :endDate and u.endDate >= :startDate
              and (:excludedId is null or u.apartmentUnavailabilityId <> :excludedId)
            """)
    boolean existsOverlapping(Integer apartmentId, LocalDate startDate, LocalDate endDate, Long excludedId);

    @Query("""
            select count(u) > 0 from ApartmentUnavailability u
            where u.apartment.apartmentId = :apartmentId
              and :date between u.startDate and u.endDate
            """)
    boolean existsOnDate(Integer apartmentId, LocalDate date);

    @Query("""
            select count(u) > 0 from ApartmentUnavailability u
            where u.apartment.apartmentId = :apartmentId
              and u.startDate < :checkOutDate and u.endDate >= :checkInDate
            """)
    boolean existsForStay(Integer apartmentId, LocalDate checkInDate, LocalDate checkOutDate);
}
