package org.unibl.etf.efikas.repositories;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;
import org.unibl.etf.efikas.exceptions.DomainConflictException;
import org.unibl.etf.efikas.models.entities.AppUser;
import org.unibl.etf.efikas.models.enums.UserRole;
import org.unibl.etf.efikas.models.requests.ApartmentRequest;
import org.unibl.etf.efikas.models.requests.ApartmentTypeRequest;
import org.unibl.etf.efikas.models.requests.CreateReservationRequest;
import org.unibl.etf.efikas.models.requests.RecordPaymentRequest;
import org.unibl.etf.efikas.services.ApartmentService;
import org.unibl.etf.efikas.services.ApartmentTypeService;
import org.unibl.etf.efikas.services.PaymentService;
import org.unibl.etf.efikas.services.ReservationService;
import org.unibl.etf.efikas.services.interfaces.S3Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class B05PaymentConcurrencyIntegrationTest {
    @Autowired TransactionTemplate transactionTemplate;
    @Autowired AppUserRepository appUserRepository;
    @Autowired ApartmentTypeService apartmentTypeService;
    @Autowired ApartmentService apartmentService;
    @Autowired ReservationService reservationService;
    @Autowired PaymentService paymentService;

    @MockitoBean S3Service s3Service;

    @Test
    void concurrentPaymentsCannotOverpayReservation() throws Exception {
        Seed seed = transactionTemplate.execute(status -> seed());
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            var first = executor.submit(() -> record(seed, ready, start));
            var second = executor.submit(() -> record(seed, ready, start));
            ready.await();
            start.countDown();

            assertThat(List.of(first.get(), second.get())).containsExactlyInAnyOrder(true, false);
            assertThat(paymentService.summary(seed.reservationId()).netPaid()).isEqualByComparingTo("75.00");
            assertThat(paymentService.findAll(seed.reservationId())).hasSize(1);
        } finally {
            executor.shutdownNow();
        }
    }

    private boolean record(Seed seed, CountDownLatch ready, CountDownLatch start) {
        ready.countDown();
        try {
            start.await();
            paymentService.record(seed.reservationId(),
                    new RecordPaymentRequest(new BigDecimal("75.00"), null, null), seed.agentEmail());
            return true;
        } catch (DomainConflictException ex) {
            return false;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Concurrent payment test was interrupted.", ex);
        }
    }

    private Seed seed() {
        String suffix = UUID.randomUUID().toString().substring(0, 10);
        AppUser manager = appUserRepository.save(user(
                "b05-concurrent-manager-" + suffix + "@example.invalid", suffix + "11", UserRole.MANAGER));
        AppUser agent = appUserRepository.save(user(
                "b05-concurrent-agent-" + suffix + "@example.invalid", suffix + "12", UserRole.AGENT));
        var type = apartmentTypeService.create(new ApartmentTypeRequest(
                "B05 Concurrent " + suffix, null, 2, new BigDecimal("100.00")));
        var apartment = apartmentService.create(new ApartmentRequest(
                "B05 Concurrent " + suffix, "Concurrency address", null, type.apartmentTypeId()),
                manager.getEmail());
        LocalDate checkIn = LocalDate.now().plusDays(3);
        var reservation = reservationService.create(new CreateReservationRequest(
                apartment.apartmentId(), checkIn, checkIn.plusDays(1), 1, null, null), agent.getEmail());
        return new Seed(reservation.reservationId(), agent.getEmail());
    }

    private static AppUser user(String email, String seed, UserRole role) {
        AppUser user = new AppUser();
        user.setName("B05");
        user.setSurname("Concurrent");
        user.setJmbg(String.format("%013d", Integer.toUnsignedLong(seed.hashCode()) % 10_000_000_000_000L));
        user.setPasswordHash("not-a-real-password-hash");
        user.setEmail(email);
        user.setRole(role);
        user.setAddress("Concurrency address");
        user.setActive(true);
        return user;
    }

    private record Seed(Integer reservationId, String agentEmail) {
    }
}
