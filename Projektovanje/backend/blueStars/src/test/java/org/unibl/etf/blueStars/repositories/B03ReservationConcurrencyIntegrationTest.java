package org.unibl.etf.blueStars.repositories;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.support.TransactionTemplate;
import org.unibl.etf.blueStars.models.entities.AppUser;
import org.unibl.etf.blueStars.models.enums.UserRole;
import org.unibl.etf.blueStars.models.requests.ApartmentRequest;
import org.unibl.etf.blueStars.models.requests.ApartmentTypeRequest;
import org.unibl.etf.blueStars.services.ApartmentService;
import org.unibl.etf.blueStars.services.ApartmentTypeService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class B03ReservationConcurrencyIntegrationTest {
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired TransactionTemplate transactionTemplate;
    @Autowired AppUserRepository appUserRepository;
    @Autowired ApartmentTypeService apartmentTypeService;
    @Autowired ApartmentService apartmentService;

    @Test
    void databaseAllowsOnlyOneOfTwoConcurrentOverlappingInserts() throws Exception {
        Seed seed = transactionTemplate.execute(status -> seed());
        LocalDate checkIn = LocalDate.now().plusDays(60);
        LocalDate checkOut = checkIn.plusDays(3);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        var executor = Executors.newFixedThreadPool(2);
        try {
            var first = executor.submit(() -> insertReservation(seed, checkIn, checkOut, ready, start));
            var second = executor.submit(() -> insertReservation(seed, checkIn.plusDays(1), checkOut.plusDays(1), ready, start));
            ready.await();
            start.countDown();

            assertThat(java.util.List.of(first.get(), second.get()))
                    .containsExactlyInAnyOrder(true, false);
        } finally {
            executor.shutdownNow();
        }

        Integer count = jdbcTemplate.queryForObject(
                "select count(*) from efikas.reservation where \"ApartmentId\" = ?", Integer.class,
                seed.apartmentId());
        assertThat(count).isEqualTo(1);
    }

    private boolean insertReservation(
            Seed seed, LocalDate checkIn, LocalDate checkOut, CountDownLatch ready, CountDownLatch start
    ) {
        ready.countDown();
        try {
            start.await();
            jdbcTemplate.update("""
                    insert into efikas.reservation
                        ("ApartmentId", "ApartmentTypeSnapshotId", "GuestQuantity", "CheckInDate", "CheckOutDate",
                         "NightlyRate", "Status", "CreatedBy")
                    values (?, ?, 1, ?, ?, 90.00, 'CONFIRMED', ?)
                    """, seed.apartmentId(), seed.apartmentTypeId(), checkIn, checkOut, seed.userId());
            return true;
        } catch (DataIntegrityViolationException ex) {
            return false;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Concurrent reservation test was interrupted.", ex);
        }
    }

    private Seed seed() {
        String suffix = UUID.randomUUID().toString().substring(0, 18);
        AppUser user = new AppUser();
        user.setName("B03");
        user.setSurname("Concurrent");
        user.setJmbg(String.format("%013d", Math.abs((long) suffix.hashCode())));
        user.setPasswordHash("not-a-real-password-hash");
        user.setEmail("b03-" + suffix + "@example.invalid");
        user.setRole(UserRole.MANAGER);
        user.setAddress("Concurrency address");
        user.setActive(true);
        AppUser savedUser = appUserRepository.save(user);
        var type = apartmentTypeService.create(new ApartmentTypeRequest(
                "B03 Concurrent " + suffix, null, 2, new BigDecimal("90.00")));
        var apartment = apartmentService.create(new ApartmentRequest(
                "B03 Concurrent " + suffix, "Concurrency address", null, type.apartmentTypeId()), savedUser.getEmail());
        return new Seed(apartment.apartmentId(), type.apartmentTypeId(), savedUser.getUserId());
    }

    private record Seed(Integer apartmentId, Integer apartmentTypeId, Integer userId) {
    }
}
