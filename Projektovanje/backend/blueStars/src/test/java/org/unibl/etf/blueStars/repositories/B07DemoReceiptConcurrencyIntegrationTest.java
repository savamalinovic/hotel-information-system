package org.unibl.etf.blueStars.repositories;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;
import org.unibl.etf.blueStars.models.entities.AppUser;
import org.unibl.etf.blueStars.models.enums.Gender;
import org.unibl.etf.blueStars.models.enums.UserRole;
import org.unibl.etf.blueStars.models.requests.AddReservationGuestRequest;
import org.unibl.etf.blueStars.models.requests.ApartmentRequest;
import org.unibl.etf.blueStars.models.requests.ApartmentTypeRequest;
import org.unibl.etf.blueStars.models.requests.CreateReservationRequest;
import org.unibl.etf.blueStars.models.requests.GuestRequest;
import org.unibl.etf.blueStars.models.requests.RecordPaymentRequest;
import org.unibl.etf.blueStars.services.ApartmentService;
import org.unibl.etf.blueStars.services.ApartmentTypeService;
import org.unibl.etf.blueStars.services.CheckInService;
import org.unibl.etf.blueStars.services.CheckOutService;
import org.unibl.etf.blueStars.services.DemoReceiptService;
import org.unibl.etf.blueStars.services.GuestService;
import org.unibl.etf.blueStars.services.PaymentService;
import org.unibl.etf.blueStars.services.ReservationService;
import org.unibl.etf.blueStars.services.interfaces.S3Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class B07DemoReceiptConcurrencyIntegrationTest {
    @Autowired TransactionTemplate transactions;
    @Autowired DemoReceiptService receipts;
    @Autowired PaymentService payments;
    @Autowired CheckOutService checkOut;
    @Autowired CheckInService checkIn;
    @Autowired GuestService guests;
    @Autowired ReservationService reservations;
    @Autowired ApartmentService apartments;
    @Autowired ApartmentTypeService apartmentTypes;
    @Autowired AppUserRepository users;
    @Autowired DemoReceiptRepository receiptRepository;
    @Autowired IncomeBookEntryRepository incomeRepository;
    @MockitoBean S3Service storage;

    @Test
    void concurrentGenerationReturnsTheSameReceiptAndIncomeEntry() throws Exception {
        Seed seed = transactions.execute(status -> seed());
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            var first = executor.submit(() -> generate(seed.reservationId(), seed.firstAgent(), ready, start));
            var second = executor.submit(() -> generate(seed.reservationId(), seed.secondAgent(), ready, start));
            ready.await();
            start.countDown();
            assertThat(first.get().receipt().demoReceiptId()).isEqualTo(second.get().receipt().demoReceiptId());
            assertThat(receiptRepository.findByReservationReservationId(seed.reservationId())).isPresent();
            assertThat(incomeRepository.findByReservationReservationId(seed.reservationId())).isPresent();
        } finally {
            executor.shutdownNow();
        }
    }

    private DemoReceiptService.GenerationResult generate(
            Integer reservationId, String email, CountDownLatch ready, CountDownLatch start
    ) {
        ready.countDown();
        try {
            start.await();
            return receipts.generate(reservationId, email);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        }
    }

    private Seed seed() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        AppUser manager = users.save(user("m" + suffix, UserRole.MANAGER));
        AppUser first = users.save(user("a" + suffix, UserRole.AGENT));
        AppUser second = users.save(user("b" + suffix, UserRole.AGENT));
        var type = apartmentTypes.create(new ApartmentTypeRequest(
                "B07 Concurrent " + suffix, null, 2, new BigDecimal("80.00")));
        var apartment = apartments.create(new ApartmentRequest(
                "B07 Concurrent " + suffix, "Concurrency address", null, type.apartmentTypeId()), manager.getEmail());
        Integer reservationId = reservations.create(new CreateReservationRequest(
                apartment.apartmentId(), LocalDate.now(), LocalDate.now().plusDays(2), 1, null, null),
                first.getEmail()).reservationId();
        guests.addToReservation(reservationId,
                new AddReservationGuestRequest(null, guest("g" + suffix), true), first.getEmail());
        checkIn.checkIn(reservationId, first.getEmail());
        payments.record(reservationId, new RecordPaymentRequest(
                new BigDecimal("160.00"), "Concurrent payment", null), first.getEmail());
        checkOut.checkOut(reservationId, first.getEmail());
        return new Seed(reservationId, first.getEmail(), second.getEmail());
    }

    private static GuestRequest guest(String id) {
        return new GuestRequest(id, true, null, "B07", "Concurrent", Gender.Male, null,
                LocalDate.of(1985, 1, 1), "Mostar", "Mostar", "Bosnia and Herzegovina",
                "Guest address", null, null, null, null, null, null, null, null);
    }

    private static AppUser user(String label, UserRole role) {
        AppUser user = new AppUser(); user.setName("B07"); user.setSurname(role.name());
        user.setJmbg(String.format("%013d", Integer.toUnsignedLong(label.hashCode()) % 10_000_000_000_000L));
        user.setPasswordHash("hash"); user.setEmail("b07c-" + label + "@example.invalid");
        user.setRole(role); user.setAddress("Concurrency address"); user.setActive(true); return user;
    }

    private record Seed(Integer reservationId, String firstAgent, String secondAgent) {
    }
}
