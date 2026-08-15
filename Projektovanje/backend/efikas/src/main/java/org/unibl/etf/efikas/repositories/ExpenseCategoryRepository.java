package org.unibl.etf.efikas.repositories;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.unibl.etf.efikas.models.entities.ExpenseCategory;

import java.util.Optional;

public interface ExpenseCategoryRepository extends JpaRepository<ExpenseCategory, Integer> {
    boolean existsByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndExpenseCategoryIdNot(String name, Integer expenseCategoryId);
    Page<ExpenseCategory> findByActive(boolean active, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select category from ExpenseCategory category where category.expenseCategoryId = :categoryId")
    Optional<ExpenseCategory> findByIdForUpdate(Integer categoryId);
}
