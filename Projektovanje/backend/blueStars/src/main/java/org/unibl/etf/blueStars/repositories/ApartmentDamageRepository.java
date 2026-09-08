package org.unibl.etf.blueStars.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.unibl.etf.blueStars.models.entities.ApartmentDamage;
import org.unibl.etf.blueStars.models.entities.ApartmentDamageId;
import org.unibl.etf.blueStars.models.entities.ApartmentExpense;
import org.unibl.etf.blueStars.models.entities.ApartmentExpenseId;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApartmentDamageRepository extends JpaRepository<ApartmentDamage, Long> {
    List<ApartmentDamage> findApartmentDamageByApartmentApartmentId(Integer apartment_apartmentId);
    Optional<ApartmentDamage> findApartmentDamageById(ApartmentDamageId id);
}
