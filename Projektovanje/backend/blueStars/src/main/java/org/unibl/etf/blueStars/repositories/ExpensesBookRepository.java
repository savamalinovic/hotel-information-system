package org.unibl.etf.blueStars.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.unibl.etf.blueStars.models.entities.ExpensesBook;

public interface ExpensesBookRepository extends JpaRepository<ExpensesBook, Integer> {
}
