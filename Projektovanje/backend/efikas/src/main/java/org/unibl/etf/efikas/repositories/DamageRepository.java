package org.unibl.etf.efikas.repositories;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.unibl.etf.efikas.models.entities.Damage;

import java.util.Optional;

public interface DamageRepository extends JpaRepository<Damage, Long> {
    Page<Damage> findByApartmentApartmentId(Integer apartmentId, Pageable pageable);
    Optional<Damage> findByDamageIdAndApartmentApartmentId(Long damageId, Integer apartmentId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select damage from Damage damage
            where damage.damageId = :damageId and damage.apartment.apartmentId = :apartmentId
            """)
    Optional<Damage> findByApartmentAndIdForUpdate(Integer apartmentId, Long damageId);
}
