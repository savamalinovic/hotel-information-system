package org.unibl.etf.blueStars.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.unibl.etf.blueStars.models.entities.IncomeBook;

public interface IncomeBookRepository extends JpaRepository<IncomeBook, Integer> {
}
