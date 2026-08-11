package org.unibl.etf.efikas.repositories;

import org.unibl.etf.efikas.models.entities.Apartment;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

@SpringBootTest
public class ApartmentRepositoryTest {

    @Autowired
    private ApartmentRepository apartmentRepository;

    @Test
    void shouldPrintAllApartments() {
        List<Apartment> apartments = apartmentRepository.findAll();

        if (apartments.isEmpty()) {
            System.out.println("⚠️  Tabela 'apartment' je prazna.");
        } else {
            System.out.println("✅ Svi redovi iz tabele 'apartment':");
            apartments.forEach(a -> System.out.println(
                    "ID: " + a.getApartmentId() +
                            ", Address: " + a.getAddress() +
                            ", Type: " + a.getType().getName()
            ));
        }
    }
}
