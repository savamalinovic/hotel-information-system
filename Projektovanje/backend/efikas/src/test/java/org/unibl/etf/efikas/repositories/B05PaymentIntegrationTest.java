package org.unibl.etf.efikas.repositories;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.efikas.exceptions.DomainConflictException;
import org.unibl.etf.efikas.models.entities.AppUser;
import org.unibl.etf.efikas.models.enums.PaymentStatus;
import org.unibl.etf.efikas.models.enums.PaymentType;
import org.unibl.etf.efikas.models.enums.UserRole;
import org.unibl.etf.efikas.models.requests.ApartmentRequest;
import org.unibl.etf.efikas.models.requests.ApartmentTypeRequest;
import org.unibl.etf.efikas.models.requests.CorrectPaymentRequest;
import org.unibl.etf.efikas.models.requests.CreateReservationRequest;
import org.unibl.etf.efikas.models.requests.RecordPaymentRequest;
import org.unibl.etf.efikas.models.requests.ReversePaymentRequest;
import org.unibl.etf.efikas.models.requests.UpdateReservationStayRequest;
import org.unibl.etf.efikas.services.ApartmentService;
import org.unibl.etf.efikas.services.ApartmentTypeService;
import org.unibl.etf.efikas.services.PaymentService;
import org.unibl.etf.efikas.services.ReservationService;
import org.unibl.etf.efikas.services.interfaces.S3Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class B05PaymentIntegrationTest {
    @Autowired PaymentService paymentService;
    @Autowired ReservationService reservationService;
    @Autowired ApartmentService apartmentService;
    @Autowired ApartmentTypeService apartmentTypeService;
    @Autowired AppUserRepository appUserRepository;
    @Autowired JdbcTemplate jdbcTemplate;

    @MockitoBean S3Service s3Service;

    @Test
    void recordsMultiplePaymentsAndDerivesStatusWithoutAllowingOverpayment() {
        Seed seed = seed(3, "100.00");

        var first = paymentService.record(seed.reservationId(),
                new RecordPaymentRequest(new BigDecimal("100.00"), "CARD-1", "Card payment"),
                seed.agent().getEmail());
        assertThat(paymentService.summary(seed.reservationId()).status())
                .isEqualTo(PaymentStatus.PARTIALLY_PAID);

        var second = paymentService.record(seed.reservationId(),
                new RecordPaymentRequest(new BigDecimal("200.00"), null, null), seed.agent().getEmail());
        var summary = paymentService.summary(seed.reservationId());

        assertThat(summary.totalDue()).isEqualByComparingTo("300.00");
        assertThat(summary.netPaid()).isEqualByComparingTo("300.00");
        assertThat(summary.outstandingBalance()).isEqualByComparingTo("0.00");
        assertThat(summary.status()).isEqualTo(PaymentStatus.PAID);
        assertThat(paymentService.findAll(seed.reservationId()))
                .extracting("paymentId").containsExactly(second.paymentId(), first.paymentId());
        assertThat(paymentService.findAll(seed.reservationId()))
                .allSatisfy(entry -> assertThat(entry.recordedByUserId()).isEqualTo(seed.agent().getUserId()));
        assertThatThrownBy(() -> paymentService.record(seed.reservationId(),
                new RecordPaymentRequest(new BigDecimal("0.01"), null, null), seed.agent().getEmail()))
                .isInstanceOf(DomainConflictException.class)
                .hasMessageContaining("cannot exceed");
    }

    @Test
    void appendsCorrectionsAndExactReversalAndRejectsFurtherChanges() {
        Seed seed = seed(3, "100.00");
        var original = paymentService.record(seed.reservationId(),
                new RecordPaymentRequest(new BigDecimal("200.00"), "CASH-1", null), seed.agent().getEmail());

        var correction = paymentService.correct(seed.reservationId(), original.paymentId(),
                new CorrectPaymentRequest(new BigDecimal("-50.00"), "Counting correction"),
                seed.agent().getEmail());
        var reversal = paymentService.reverse(seed.reservationId(), original.paymentId(),
                new ReversePaymentRequest("Payment returned"), seed.agent().getEmail());

        assertThat(correction.type()).isEqualTo(PaymentType.CORRECTION);
        assertThat(correction.amount()).isEqualByComparingTo("-50.00");
        assertThat(reversal.type()).isEqualTo(PaymentType.REVERSAL);
        assertThat(reversal.amount()).isEqualByComparingTo("-150.00");
        assertThat(paymentService.summary(seed.reservationId()).status()).isEqualTo(PaymentStatus.UNPAID);
        assertThatThrownBy(() -> paymentService.correct(seed.reservationId(), original.paymentId(),
                new CorrectPaymentRequest(BigDecimal.ONE, "Too late"), seed.agent().getEmail()))
                .isInstanceOf(DomainConflictException.class).hasMessageContaining("already been reversed");
        assertThatThrownBy(() -> paymentService.reverse(seed.reservationId(), original.paymentId(),
                new ReversePaymentRequest("Again"), seed.agent().getEmail()))
                .isInstanceOf(DomainConflictException.class).hasMessageContaining("already been reversed");
    }

    @Test
    void paidAmountProtectsStayTotalInService() {
        Seed seed = seed(3, "100.00");
        paymentService.record(seed.reservationId(),
                new RecordPaymentRequest(new BigDecimal("250.00"), null, null), seed.agent().getEmail());

        assertThatThrownBy(() -> reservationService.updateStay(seed.reservationId(),
                new UpdateReservationStayRequest(seed.checkIn().plusDays(2)), seed.agent().getEmail()))
                .isInstanceOf(DomainConflictException.class)
                .hasMessageContaining("below the paid amount");
    }

    @Test
    void databaseMakesLedgerEntriesImmutable() {
        Seed seed = seed(2, "100.00");
        var payment = paymentService.record(seed.reservationId(),
                new RecordPaymentRequest(new BigDecimal("50.00"), null, null), seed.agent().getEmail());

        assertThatThrownBy(() -> jdbcTemplate.update(
                "update efikas.payment set \"Reason\" = 'Changed' where \"PaymentId\" = ?", payment.paymentId()))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("immutable");
    }

    @Test
    void databaseRejectsDirectOverpayment() {
        Seed seed = seed(2, "100.00");

        assertThatThrownBy(() -> jdbcTemplate.update("""
                insert into efikas.payment
                    ("ReservationId", "Type", "Amount", "Reason", "RecordedBy")
                values (?, 'PAYMENT', 200.01, 'Direct overpayment', ?)
                """, seed.reservationId(), seed.agent().getUserId()))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("cannot exceed");
    }

    @Test
    void databaseRejectsReducingReservationTotalBelowPayments() {
        Seed seed = seed(3, "100.00");
        paymentService.record(seed.reservationId(),
                new RecordPaymentRequest(new BigDecimal("250.00"), null, null), seed.agent().getEmail());

        assertThatThrownBy(() -> jdbcTemplate.update(
                "update efikas.reservation set \"CheckOutDate\" = ? where \"ReservationId\" = ?",
                seed.checkIn().plusDays(2), seed.reservationId()))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("below net payments");
    }

    private Seed seed(int nights, String nightlyRate) {
        String suffix = UUID.randomUUID().toString().substring(0, 10);
        AppUser manager = appUserRepository.save(user(
                "b05-manager-" + suffix + "@example.invalid", suffix + "001", UserRole.MANAGER));
        AppUser agent = appUserRepository.save(user(
                "b05-agent-" + suffix + "@example.invalid", suffix + "002", UserRole.AGENT));
        var type = apartmentTypeService.create(new ApartmentTypeRequest(
                "B05 Type " + suffix, null, 2, new BigDecimal(nightlyRate)));
        var apartment = apartmentService.create(new ApartmentRequest(
                "B05 Apartment " + suffix, "Payment address", null, type.apartmentTypeId()), manager.getEmail());
        LocalDate checkIn = LocalDate.now().plusDays(2);
        var reservation = reservationService.create(new CreateReservationRequest(
                apartment.apartmentId(), checkIn, checkIn.plusDays(nights), 1,
                new BigDecimal(nightlyRate), null), agent.getEmail());
        return new Seed(reservation.reservationId(), checkIn, agent);
    }

    private static AppUser user(String email, String seed, UserRole role) {
        AppUser user = new AppUser();
        user.setName("B05");
        user.setSurname(role.name());
        user.setJmbg(String.format("%013d", Integer.toUnsignedLong(seed.hashCode()) % 10_000_000_000_000L));
        user.setPasswordHash("not-a-real-password-hash");
        user.setEmail(email);
        user.setRole(role);
        user.setAddress("Payment integration address");
        user.setActive(true);
        return user;
    }

    private record Seed(Integer reservationId, LocalDate checkIn, AppUser agent) {
    }
}
