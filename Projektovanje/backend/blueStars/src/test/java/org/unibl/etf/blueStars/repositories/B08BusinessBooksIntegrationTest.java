package org.unibl.etf.blueStars.repositories;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.blueStars.models.entities.AppUser;
import org.unibl.etf.blueStars.models.enums.Gender;
import org.unibl.etf.blueStars.models.enums.GuestBookType;
import org.unibl.etf.blueStars.models.enums.UserRole;
import org.unibl.etf.blueStars.models.requests.AddReservationGuestRequest;
import org.unibl.etf.blueStars.models.requests.ApartmentRequest;
import org.unibl.etf.blueStars.models.requests.ApartmentTypeRequest;
import org.unibl.etf.blueStars.models.requests.CreateReservationRequest;
import org.unibl.etf.blueStars.models.requests.GuestRequest;
import org.unibl.etf.blueStars.services.ApartmentService;
import org.unibl.etf.blueStars.services.ApartmentTypeService;
import org.unibl.etf.blueStars.services.BusinessBooksService;
import org.unibl.etf.blueStars.services.CheckInService;
import org.unibl.etf.blueStars.services.GuestService;
import org.unibl.etf.blueStars.services.ReservationService;
import org.unibl.etf.blueStars.services.interfaces.S3Service;

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
    void incomeBookHasReadOnlyEmptyStateBeforeDemoReceiptFlow() {
        assertThat(books.income(null, null, "B08-NO-MATCH", PageRequest.of(0, 20)).content()).isEmpty();
        assertThat(new String(books.exportIncome(null, null, "B08-NO-MATCH"), StandardCharsets.UTF_8))
                .startsWith("\uFEFF\"incomeBookEntryId\"");
    }

    @Test
    void rejectsInvalidPeriodsAndNegativeIncomeAmounts() {
        assertThatThrownBy(() -> books.domesticGuests(
                LocalDate.now(), LocalDate.now().minusDays(1), null, PageRequest.of(0, 20)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("from");

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
