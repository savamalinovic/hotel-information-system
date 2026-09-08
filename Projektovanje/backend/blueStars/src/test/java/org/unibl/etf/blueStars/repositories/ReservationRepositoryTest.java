package org.unibl.etf.blueStars.repositories;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.unibl.etf.blueStars.models.entities.Reservation;

import java.util.List;

@SpringBootTest
public class ReservationRepositoryTest {

    @Autowired
    private ReservationRepository reservationRepository;

    @Test
    void shouldPrintAllReservations() {
        List<Reservation> reservations = reservationRepository.findAll();

        if (reservations.isEmpty()) {
            System.out.println("⚠️  Tabela 'reservation' je prazna.");
        } else {
            System.out.println("✅ Svi redovi iz tabele 'reservation':");
            reservations.forEach(r -> System.out.println(
                    "ID: " + r.getReservationId()
            ));
        }
    }
}
