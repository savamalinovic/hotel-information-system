package org.unibl.etf.blueStars.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.unibl.etf.blueStars.models.entities.CashRegister;

import java.util.List;
import java.util.Optional;

@Repository
public interface CashRegisterRepository extends JpaRepository<CashRegister, Long> {
    Optional<CashRegister> findCashRegisterByCashRegisterId(Integer cashRegisterId);
    List<CashRegister> findByUserEmail(String email);
}