package org.unibl.etf.blueStars.repositories;

import org.unibl.etf.blueStars.models.entities.CashRegister;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

@SpringBootTest
public class CashRegisterRepositoryTest {

    @Autowired
    private CashRegisterRepository cashRegisterRepository;

    @Test
    void shouldPrintAllCashRegisters() {
        List<CashRegister> registers = cashRegisterRepository.findAll();

        if (registers.isEmpty()) {
            System.out.println("⚠️  Tabela 'cash_register' je prazna.");
        } else {
            System.out.println("✅ Svi redovi iz tabele 'cash_register':");
            registers.forEach(c -> System.out.println(
                    "ID: " + c.getCashRegisterId() +
                            ", Cash register Number: " + c.getCashRegisterNumber()
            ));
        }
    }
}
