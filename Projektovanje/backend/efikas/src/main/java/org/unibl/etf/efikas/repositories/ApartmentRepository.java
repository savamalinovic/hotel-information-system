package org.unibl.etf.efikas.repositories;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.unibl.etf.efikas.models.entities.Apartment;

import java.util.Optional;

@Repository
public interface ApartmentRepository extends JpaRepository<Apartment, Integer>, JpaSpecificationExecutor<Apartment> {
    boolean existsByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndApartmentIdNot(String name, Integer apartmentId);
    boolean existsByTypeApartmentTypeIdAndActiveTrue(Integer apartmentTypeId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Apartment a where a.apartmentId = :apartmentId")
    Optional<Apartment> findByIdForUpdate(Integer apartmentId);
}
