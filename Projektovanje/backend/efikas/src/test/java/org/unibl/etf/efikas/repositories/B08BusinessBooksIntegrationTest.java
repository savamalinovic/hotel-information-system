package org.unibl.etf.efikas.repositories;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.efikas.models.entities.AppUser;
import org.unibl.etf.efikas.models.enums.Gender;
import org.unibl.etf.efikas.models.enums.GuestBookType;
import org.unibl.etf.efikas.models.enums.UserRole;
import org.unibl.etf.efikas.models.requests.AddReservationGuestRequest;
import org.unibl.etf.efikas.models.requests.ApartmentRequest;
import org.unibl.etf.efikas.models.requests.ApartmentTypeRequest;
import org.unibl.etf.efikas.models.requests.CreateReservationRequest;
import org.unibl.etf.efikas.models.requests.GuestRequest;
import org.unibl.etf.efikas.services.ApartmentService;
import org.unibl.etf.efikas.services.ApartmentTypeService;
import org.unibl.etf.efikas.services.BusinessBooksService;
import org.unibl.etf.efikas.services.CheckInService;
import org.unibl.etf.efikas.services.GuestService;
import org.unibl.etf.efikas.services.ReservationService;
import org.unibl.etf.efikas.services.interfaces.S3Service;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class B08BusinessBooksIntegrationTest {
    @Autowired BusinessBooksService books;
    @Autowired GuestService guestService;
    @Autowired CheckInService checkInService;
    @Autowired ReservationService reservationService;
    @Autowired ApartmentService apartmentService;
    @Autowired ApartmentTypeService apartmentTypeService;
    @Autowired AppUserRepository appUserRepository;
    @Autowired JdbcTemplate jdbcTemplate;

    @MockitoBean S3Service s3Service;

    @Test
    void readsFiltersAndExportsFinalGuestBookSnapshots() {
        AppUser manager = appUserRepository.save(user("b08-manager@example.invalid", "9500000000001", UserRole.MANAGER));
        AppUser agent = appUserRepository.save(user("b08-agent@example.invalid", "9500000000002", UserRole.AGENT));
        Integer reservationId = reservation(manager, agent, 2);

        guestService.addToReservation(reservationId,
                new AddReservationGuestRequest(null, domesticGuest("0101990710801", "Mila"), true), agent.getEmail());
        guestService.addToReservation(reservationId,
                new AddReservationGuestRequest(null, foreignGuest("B08-FOREIGN-1", "Anna"), false), agent.getEmail());
        checkInService.checkIn(reservationId, agent.getEmail());

        var domestic = books.domesticGuests(LocalDate.now(), LocalDate.now(), "Mila", PageRequest.of(0, 20));
        var foreign = books.foreignGuests(LocalDate.now(), LocalDate.now(), "PASS-B08", PageRequest.of(0, 20));

        assertThat(domestic.content()).singleElement().satisfies(entry -> {
            assertThat(entry.bookType()).isEqualTo(GuestBookType.DOMESTIC);
            assertThat(entry.reservationId()).isEqualTo(reservationId);
            assertThat(entry.birthMunicipality()).isEqualTo("Banja Luka");
            assertThat(entry.apartmentName()).startsWith("B08 Apartment");
        });
        assertThat(foreign.content()).singleElement().satisfies(entry -> {
            assertThat(entry.bookType()).isEqualTo(GuestBookType.FOREIGN);
            assertThat(entry.citizenship()).isEqualTo("Germany");
            assertThat(entry.passportNumber()).isEqualTo("PASS-B08");
            assertThat(entry.entryPlace()).isEqualTo("Sarajevo");
        });
        assertThat(books.domesticGuests(LocalDate.now().plusDays(1), null, null, PageRequest.of(0, 20)).content())
                .isEmpty();

        String csv = new String(books.exportForeignGuests(null, null, "Anna"), StandardCharsets.UTF_8);
        assertThat(csv).startsWith("\uFEFF\"guestBookEntryId\"")
                .contains("\"B08-FOREIGN-1\"")
                .contains("\"PASS-B08\"");
    }

    @Test
    void incomeBookIsAutomaticIdempotentAndDatabaseImmutable() {
        AppUser manager = appUserRepository.save(user("b08-income-manager@example.invalid", "9500000000003", UserRole.MANAGER));
        AppUser agent = appUserRepository.save(user("b08-income-agent@example.invalid", "9500000000004", UserRole.AGENT));
        Integer reservationId = reservation(manager, agent, 1);

        var created = books.recordGeneratedReceipt(reservationId, "DEMO-B08-0001", LocalDate.now(),
                "Accommodation service", new BigDecimal("90.00"), new BigDecimal("105.30"),
                new BigDecimal("15.30"));
        var repeated = books.recordGeneratedReceipt(reservationId, "DEMO-B08-0001", LocalDate.now(),
                "Accommodation service", new BigDecimal("90.00"), new BigDecimal("105.30"),
                new BigDecimal("15.30"));

        assertThat(repeated.incomeBookEntryId()).isEqualTo(created.incomeBookEntryId());
        assertThatThrownBy(() -> books.recordGeneratedReceipt(reservationId, "DEMO-B08-0001", LocalDate.now(),
                "Changed amount", new BigDecimal("91.00"), new BigDecimal("106.30"),
                new BigDecimal("15.30")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("different income-book entry");
        assertThat(books.income(LocalDate.now(), LocalDate.now(), "DEMO-B08", PageRequest.of(0, 20)).content())
                .singleElement().satisfies(entry -> {
                    assertThat(entry.reservationId()).isEqualTo(reservationId);
                    assertThat(entry.totalRevenue()).isEqualByComparingTo("105.30");
                });
        assertThat(new String(books.exportIncome(null, null, null), StandardCharsets.UTF_8))
                .contains("\"DEMO-B08-0001\"")
                .contains("\"105.30\"");
        assertThatThrownBy(() -> jdbcTemplate.update(
                "update efikas.income_book_entry set \"Description\" = 'Changed' where \"IncomeBookEntryId\" = ?",
                created.incomeBookEntryId()))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("immutable");
    }

    @Test
    void rejectsInvalidPeriodsAndNegativeIncomeAmounts() {
        assertThatThrownBy(() -> books.domesticGuests(
                LocalDate.now(), LocalDate.now().minusDays(1), null, PageRequest.of(0, 20)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("from");

        AppUser manager = appUserRepository.save(user("b08-validation-manager@example.invalid", "9500000000005", UserRole.MANAGER));
        AppUser agent = appUserRepository.save(user("b08-validation-agent@example.invalid", "9500000000006", UserRole.AGENT));
        Integer reservationId = reservation(manager, agent, 1);
        assertThatThrownBy(() -> books.recordGeneratedReceipt(reservationId, "DEMO-B08-NEG", LocalDate.now(),
                "Invalid", BigDecimal.ONE.negate(), BigDecimal.ZERO, BigDecimal.ZERO))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Service sale revenue");
    }

    private Integer reservation(AppUser manager, AppUser creator, int guestCount) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        var type = apartmentTypeService.create(new ApartmentTypeRequest(
                "B08 Type " + suffix, null, 4, new BigDecimal("105.30")));
        var apartment = apartmentService.create(new ApartmentRequest(
                "B08 Apartment " + suffix, "B08 address", 2, type.apartmentTypeId()), manager.getEmail());
        LocalDate today = LocalDate.now();
        return reservationService.create(new CreateReservationRequest(
                apartment.apartmentId(), today, today.plusDays(2), guestCount, null, null), creator.getEmail())
                .reservationId();
    }

    private static GuestRequest domesticGuest(String citizenId, String name) {
        return new GuestRequest(citizenId, true, null, name, "Domestic", Gender.Female, "+38765000000",
                LocalDate.of(1990, 1, 1), "Banja Luka", "Banja Luka", "Bosnia and Herzegovina",
                "Guest address", null, null, null, null, null, null, null, null);
    }

    private static GuestRequest foreignGuest(String citizenId, String name) {
        return new GuestRequest(citizenId, false, null, name, "Foreign", Gender.Female, "+491000000",
                LocalDate.of(1992, 2, 2), "Berlin", null, "Germany", "Guest address", "Germany",
                "PASS-B08", LocalDate.of(2020, 1, 1), null, null, LocalDate.now().plusDays(30),
                LocalDate.now(), "Sarajevo");
    }

    private static AppUser user(String email, String jmbg, UserRole role) {
        AppUser user = new AppUser();
        user.setName("B08");
        user.setSurname(role.name());
        user.setJmbg(jmbg);
        user.setPasswordHash("not-a-real-password-hash");
        user.setEmail(email);
        user.setRole(role);
        user.setAddress("B08 integration address");
        user.setActive(true);
        return user;
    }
}
