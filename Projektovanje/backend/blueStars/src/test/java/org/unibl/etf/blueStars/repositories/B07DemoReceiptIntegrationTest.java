package org.unibl.etf.blueStars.repositories;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.blueStars.exceptions.DomainConflictException;
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

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class B07DemoReceiptIntegrationTest {
    @Autowired DemoReceiptService receipts;
    @Autowired PaymentService payments;
    @Autowired CheckOutService checkOut;
    @Autowired CheckInService checkIn;
    @Autowired GuestService guests;
    @Autowired ReservationService reservations;
    @Autowired ApartmentService apartments;
    @Autowired ApartmentTypeService apartmentTypes;
    @Autowired AppUserRepository users;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean S3Service storage;

    @Test
    void generatesOneStoredPdfAndOneIncomeEntry() throws Exception {
        Seed seed = seed("success", true, true);

        var first = receipts.generate(seed.reservationId(), seed.agentEmail());
        var repeated = receipts.generate(seed.reservationId(), seed.agentEmail());

        assertThat(first.created()).isTrue();
        assertThat(repeated.created()).isFalse();
        assertThat(repeated.receipt().demoReceiptId()).isEqualTo(first.receipt().demoReceiptId());
        assertThat(repeated.receipt().pdfSha256()).isEqualTo(first.receipt().pdfSha256());
        assertThat(first.receipt().receiptNumber()).matches("DEMO-[0-9]{4}-[0-9]{6,}");
        assertThat(first.receipt().totalAmount()).isEqualByComparingTo("200.00");
        assertThat(first.receipt().vatAmount()).isEqualByComparingTo("0.00");

        byte[] pdf = receipts.pdf(seed.reservationId()).content();
        assertThat(pdf).startsWith("%PDF-".getBytes(java.nio.charset.StandardCharsets.US_ASCII));
        try (PdfDocument document = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdf)))) {
            String text = PdfTextExtractor.getTextFromPage(document.getFirstPage());
            assertThat(text).contains("DEMO – NIJE FISKALNI RAČUN", first.receipt().receiptNumber(), "200.00 BAM");
        }
        assertThat(jdbc.queryForObject(
                "select count(*) from efikas.demo_receipt where \"ReservationId\"=?", Long.class,
                seed.reservationId())).isEqualTo(1L);
        assertThat(jdbc.queryForObject(
                "select count(*) from efikas.income_book_entry where \"ReservationId\"=?", Long.class,
                seed.reservationId())).isEqualTo(1L);

        assertThatThrownBy(() -> payments.record(seed.reservationId(),
                new RecordPaymentRequest(new BigDecimal("1.00"), null, null), seed.agentEmail()))
                .isInstanceOf(DomainConflictException.class)
                .hasMessageContaining("after a demo receipt");
        assertThatThrownBy(() -> jdbc.update(
                "update efikas.demo_receipt set \"HotelName\"='Changed' where \"ReservationId\"=?",
                seed.reservationId()))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("immutable");
    }

    @Test
    void rejectsUnpaidOrNotCheckedOutReservations() {
        Seed unpaid = seed("unpaid", false, true);
        assertThatThrownBy(() -> receipts.generate(unpaid.reservationId(), unpaid.agentEmail()))
                .isInstanceOf(DomainConflictException.class)
                .hasMessageContaining("fully paid");

        Seed active = seed("active", true, false);
        assertThatThrownBy(() -> receipts.generate(active.reservationId(), active.agentEmail()))
                .isInstanceOf(DomainConflictException.class)
                .hasMessageContaining("checked-out");
    }

    private Seed seed(String label, boolean paid, boolean checkedOut) {
        String suffix = label + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        AppUser manager = users.save(user("m-" + suffix, UserRole.MANAGER));
        AppUser agent = users.save(user("a-" + suffix, UserRole.AGENT));
        var type = apartmentTypes.create(new ApartmentTypeRequest(
                "B07 Type " + suffix, null, 2, new BigDecimal("100.00")));
        var apartment = apartments.create(new ApartmentRequest(
                "B07 Apartment " + suffix, "B07 address", 1, type.apartmentTypeId()), manager.getEmail());
        Integer reservationId = reservations.create(new CreateReservationRequest(
                apartment.apartmentId(), LocalDate.now(), LocalDate.now().plusDays(2), 1, null, null),
                agent.getEmail()).reservationId();
        guests.addToReservation(reservationId,
                new AddReservationGuestRequest(null, guest("guest-" + suffix), true), agent.getEmail());
        checkIn.checkIn(reservationId, agent.getEmail());
        if (paid) {
            payments.record(reservationId, new RecordPaymentRequest(
                    new BigDecimal("200.00"), "B07 payment", null), agent.getEmail());
        }
        if (checkedOut) {
            checkOut.checkOut(reservationId, agent.getEmail());
        }
        return new Seed(reservationId, agent.getEmail());
    }

    private static GuestRequest guest(String id) {
        return new GuestRequest(id, true, null, "B07", "Guest", Gender.Female, null,
                LocalDate.of(1990, 1, 1), "Banja Luka", "Banja Luka", "Bosnia and Herzegovina",
                "Guest address", null, null, null, null, null, null, null, null);
    }

    private static AppUser user(String label, UserRole role) {
        AppUser user = new AppUser();
        user.setName("B07"); user.setSurname(role.name());
        user.setJmbg(String.format("%013d", Integer.toUnsignedLong(label.hashCode()) % 10_000_000_000_000L));
        user.setPasswordHash("hash"); user.setEmail("b07-" + label + "@example.invalid");
        user.setRole(role); user.setAddress("B07 address"); user.setActive(true);
        return user;
    }

    private record Seed(Integer reservationId, String agentEmail) {
    }
}
