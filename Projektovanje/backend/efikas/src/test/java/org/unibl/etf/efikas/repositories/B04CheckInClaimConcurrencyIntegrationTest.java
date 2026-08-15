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
import org.unibl.etf.efikas.services.ApartmentService;
import org.unibl.etf.efikas.services.ApartmentTypeService;
import org.unibl.etf.efikas.services.CheckInService;
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
class B04CheckInClaimConcurrencyIntegrationTest {
    @Autowired TransactionTemplate transactionTemplate;
    @Autowired AppUserRepository appUserRepository;
    @Autowired ApartmentTypeService apartmentTypeService;
    @Autowired ApartmentService apartmentService;
    @Autowired ReservationService reservationService;
    @Autowired CheckInService checkInService;

    @MockitoBean S3Service s3Service;

    @Test
    void onlyOneConcurrentAgentCanClaimAnUnclaimedCheckIn() throws Exception {
        Seed seed = transactionTemplate.execute(status -> seed());
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            var first = executor.submit(() -> claim(seed.reservationId(), seed.firstEmail(), ready, start));
            var second = executor.submit(() -> claim(seed.reservationId(), seed.secondEmail(), ready, start));
            ready.await();
            start.countDown();

            assertThat(List.of(first.get(), second.get())).containsExactlyInAnyOrder(true, false);
            assertThat(checkInService.claimHistory(seed.reservationId())).hasSize(1);
        } finally {
            executor.shutdownNow();
        }
    }

    private boolean claim(Integer reservationId, String email, CountDownLatch ready, CountDownLatch start) {
        ready.countDown();
        try {
            start.await();
            checkInService.claim(reservationId, email);
            return true;
        } catch (DomainConflictException ex) {
            return false;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Concurrent check-in claim test was interrupted.", ex);
        }
    }

    private Seed seed() {
        String suffix = UUID.randomUUID().toString().substring(0, 12);
        AppUser manager = appUserRepository.save(user(
                "b04-manager-" + suffix + "@example.invalid", suffix + "1", UserRole.MANAGER));
        AppUser first = appUserRepository.save(user(
                "b04-agent-a-" + suffix + "@example.invalid", suffix + "2", UserRole.AGENT));
        AppUser second = appUserRepository.save(user(
                "b04-agent-b-" + suffix + "@example.invalid", suffix + "3", UserRole.AGENT));
        var type = apartmentTypeService.create(new ApartmentTypeRequest(
                "B04 Concurrent " + suffix, null, 2, new BigDecimal("99.00")));
        var apartment = apartmentService.create(new ApartmentRequest(
                "B04 Concurrent " + suffix, "Concurrency address", null, type.apartmentTypeId()), manager.getEmail());
        var reservation = reservationService.create(new CreateReservationRequest(
                apartment.apartmentId(), LocalDate.now().plusDays(2), LocalDate.now().plusDays(4),
                1, null, null), first.getEmail());
        return new Seed(reservation.reservationId(), first.getEmail(), second.getEmail());
    }

    private static AppUser user(String email, String seed, UserRole role) {
        AppUser user = new AppUser();
        user.setName("B04");
        user.setSurname("Concurrent");
        user.setJmbg(String.format("%013d", Integer.toUnsignedLong(seed.hashCode()) % 10_000_000_000_000L));
        user.setPasswordHash("not-a-real-password-hash");
        user.setEmail(email);
        user.setRole(role);
        user.setAddress("Concurrency address");
        user.setActive(true);
        return user;
    }

    private record Seed(Integer reservationId, String firstEmail, String secondEmail) {
    }
}
