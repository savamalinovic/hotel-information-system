package org.unibl.etf.blueStars.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.unibl.etf.blueStars.models.entities.ApartmentExpense;
import org.unibl.etf.blueStars.models.entities.ApartmentExpenseId;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApartmentExpenseRepository extends JpaRepository<ApartmentExpense, Long> {
    List<ApartmentExpense> findApartmentExpenseByApartmentApartmentId(Integer apartment_apartmentId);
    Optional<ApartmentExpense> findApartmentExpenseById(ApartmentExpenseId id);
}
