package org.unibl.etf.efikas.repositories;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;
import org.unibl.etf.efikas.models.entities.AppUser;
import org.unibl.etf.efikas.models.enums.*;
import org.unibl.etf.efikas.models.requests.*;
import org.unibl.etf.efikas.models.responses.CheckOutResponse;
import org.unibl.etf.efikas.services.*;
import org.unibl.etf.efikas.services.interfaces.S3Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class B06CheckOutConcurrencyIntegrationTest {
    @Autowired TransactionTemplate transactions;
    @Autowired AppUserRepository users;
    @Autowired ApartmentTypeService apartmentTypes;
    @Autowired ApartmentService apartments;
    @Autowired ReservationService reservations;
    @Autowired GuestService guests;
    @Autowired CheckInService checkIn;
    @Autowired CheckOutService checkOut;
    @Autowired OperationalTaskRepository tasks;
    @MockitoBean S3Service storage;

    @Test
    void concurrentRetriesReturnTheSameSingleCleaningTask() throws Exception {
        Seed seed = transactions.execute(status -> seed());
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            var first = executor.submit(() -> run(seed.reservationId(), seed.firstAgent(), ready, start));
            var second = executor.submit(() -> run(seed.reservationId(), seed.secondAgent(), ready, start));
            ready.await(); start.countDown();
            assertThat(first.get().cleaningTaskId()).isEqualTo(second.get().cleaningTaskId());
            assertThat(tasks.findByReservationReservationIdAndSource(
                    seed.reservationId(), TaskSource.CHECKOUT)).isPresent();
        } finally {
            executor.shutdownNow();
        }
    }

    private CheckOutResponse run(Integer id, String email, CountDownLatch ready, CountDownLatch start) {
        ready.countDown();
        try { start.await(); return checkOut.checkOut(id, email); }
        catch (InterruptedException ex) { Thread.currentThread().interrupt(); throw new IllegalStateException(ex); }
    }

    private Seed seed() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        AppUser manager = users.save(user("m" + suffix, UserRole.MANAGER));
        AppUser first = users.save(user("a" + suffix, UserRole.AGENT));
        AppUser second = users.save(user("b" + suffix, UserRole.AGENT));
        var type = apartmentTypes.create(new ApartmentTypeRequest(
                "B06 Concurrent " + suffix, null, 2, new BigDecimal("90.00")));
        var apartment = apartments.create(new ApartmentRequest(
                "B06 Concurrent " + suffix, "Concurrency address", null, type.apartmentTypeId()), manager.getEmail());
        Integer id = reservations.create(new CreateReservationRequest(
                apartment.apartmentId(), LocalDate.now(), LocalDate.now().plusDays(2), 1, null, null),
                first.getEmail()).reservationId();
        guests.addToReservation(id, new AddReservationGuestRequest(null, guest("g" + suffix), true), first.getEmail());
        checkIn.checkIn(id, first.getEmail());
        return new Seed(id, first.getEmail(), second.getEmail());
    }

    private static GuestRequest guest(String id) {
        return new GuestRequest(id, true, null, "B06", "Guest", Gender.Male, null,
                LocalDate.of(1985, 1, 1), "Mostar", "Mostar", "Bosnia and Herzegovina",
                "Guest address", null, null, null, null, null, null, null, null);
    }

    private static AppUser user(String label, UserRole role) {
        AppUser user = new AppUser(); user.setName("B06"); user.setSurname(role.name());
        user.setJmbg(String.format("%013d", Integer.toUnsignedLong(label.hashCode()) % 10_000_000_000_000L));
        user.setPasswordHash("hash"); user.setEmail("b06c-" + label + "@example.invalid");
        user.setRole(role); user.setAddress("Concurrency address"); user.setActive(true); return user;
    }

    private record Seed(Integer reservationId, String firstAgent, String secondAgent) {}
}
