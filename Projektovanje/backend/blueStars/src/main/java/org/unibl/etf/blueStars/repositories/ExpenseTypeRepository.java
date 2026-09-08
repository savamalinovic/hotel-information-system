package org.unibl.etf.blueStars.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.unibl.etf.blueStars.models.entities.ExpenseType;

import java.util.Optional;

public interface ExpenseTypeRepository extends JpaRepository<ExpenseType, Integer> {
    Optional<ExpenseType> findByName(String expenseTypeName);
}
