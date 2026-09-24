package org.unibl.etf.blueStars.repositories;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.unibl.etf.blueStars.models.entities.OperationalExpense;

import java.util.Optional;

public interface OperationalExpenseRepository extends JpaRepository<OperationalExpense, Long>,
        JpaSpecificationExecutor<OperationalExpense> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select expense from OperationalExpense expense where expense.operationalExpenseId = :expenseId")
    Optional<OperationalExpense> findByIdForUpdate(Long expenseId);
}
