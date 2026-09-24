package org.unibl.etf.blueStars.repositories;

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
import org.unibl.etf.blueStars.models.enums.ReservationStatus;
import org.unibl.etf.blueStars.models.enums.UserRole;
import org.unibl.etf.blueStars.models.requests.*;
import org.unibl.etf.blueStars.services.*;
import org.unibl.etf.blueStars.services.interfaces.S3Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class B04GuestCheckInIntegrationTest {
    @Autowired GuestService guestService;
    @Autowired CheckInService checkInService;
    @Autowired ReservationService reservationService;
    @Autowired ApartmentService apartmentService;
    @Autowired ApartmentTypeService apartmentTypeService;
    @Autowired AppUserRepository appUserRepository;
    @Autowired JdbcTemplate jdbcTemplate;

    @MockitoBean S3Service s3Service;

    @Test
    void managesMultipleGuestsClaimsAndAtomicCheckIn() {
        AppUser manager = appUserRepository.save(user(
                "b04-manager@example.invalid", "9600000000001", UserRole.MANAGER));
        AppUser firstAgent = appUserRepository.save(user(
                "b04-agent-one@example.invalid", "9600000000002", UserRole.AGENT));
        AppUser secondAgent = appUserRepository.save(user(
                "b04-agent-two@example.invalid", "9600000000003", UserRole.AGENT));
        Integer reservationId = reservation(manager, firstAgent, 2);

        var domestic = guestService.addToReservation(reservationId,
                new AddReservationGuestRequest(null, domesticGuest("0101990710001", "Mila"), false),
                firstAgent.getEmail());
        var foreign = guestService.addToReservation(reservationId,
                new AddReservationGuestRequest(null, foreignGuest("FOREIGN-B04-1", "Anna"), false),
                firstAgent.getEmail());

        assertThat(domestic.primaryGuest()).isTrue();
        assertThat(foreign.primaryGuest()).isFalse();
        assertThat(guestService.findReservationGuests(reservationId)).hasSize(2);

        assertThat(checkInService.claim(reservationId, firstAgent.getEmail()).claimedByUserId())
                .isEqualTo(firstAgent.getUserId());
        assertThat(checkInService.release(reservationId, firstAgent.getEmail()).claimedByUserId()).isNull();
        checkInService.claim(reservationId, firstAgent.getEmail());
        assertThat(checkInService.takeover(reservationId, secondAgent.getEmail()).claimedByUserId())
                .isEqualTo(secondAgent.getUserId());

        var result = checkInService.checkIn(reservationId, firstAgent.getEmail());

        assertThat(result.reservation().status()).isEqualTo(ReservationStatus.CHECKED_IN);
        assertThat(result.reservation().checkInClaimedByUserId()).isNull();
        assertThat(result.checkedInByUserId()).isEqualTo(firstAgent.getUserId());
        assertThat(result.guestBookEntriesCreated()).isEqualTo(2);
        assertThat(jdbcTemplate.queryForList(
                "select \"BookType\" from efikas.guest_book_entry where \"ReservationId\" = ? order by \"BookType\"",
                String.class, reservationId)).containsExactly("DOMESTIC", "FOREIGN");
        assertThat(checkInService.claimHistory(reservationId)).extracting("action")
                .containsExactly(
                        org.unibl.etf.blueStars.models.enums.CheckInClaimAction.TAKEN_OVER,
                        org.unibl.etf.blueStars.models.enums.CheckInClaimAction.CLAIMED,
                        org.unibl.etf.blueStars.models.enums.CheckInClaimAction.RELEASED,
                        org.unibl.etf.blueStars.models.enums.CheckInClaimAction.CLAIMED);
        assertThat(reservationService.statusHistory(reservationId)).extracting("status")
                .containsExactly(ReservationStatus.CHECKED_IN, ReservationStatus.CONFIRMED);
        assertThatThrownBy(() -> guestService.removeFromReservation(reservationId, domestic.guest().guestId()))
                .isInstanceOf(DomainConflictException.class);
        assertThatThrownBy(() -> jdbcTemplate.update(
                "update efikas.guest_book_entry set \"Name\" = 'Changed' where \"ReservationId\" = ?",
                reservationId))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("immutable");
    }

    @Test
    void rejectsIncompleteGuestSetAndInvalidForeignIdentity() {
        AppUser manager = appUserRepository.save(user(
                "b04-validation-manager@example.invalid", "9600000000004", UserRole.MANAGER));
        AppUser agent = appUserRepository.save(user(
                "b04-validation-agent@example.invalid", "9600000000005", UserRole.AGENT));
        Integer reservationId = reservation(manager, agent, 2);

        guestService.addToReservation(reservationId,
                new AddReservationGuestRequest(null, domesticGuest("0101990710002", "Lana"), true),
                agent.getEmail());

        assertThatThrownBy(() -> checkInService.checkIn(reservationId, agent.getEmail()))
                .isInstanceOf(DomainConflictException.class)
                .hasMessageContaining("All declared");

        GuestRequest invalidForeign = new GuestRequest(
                "FOREIGN-B04-2", false, null, "No", "Passport", Gender.Female, null,
                LocalDate.of(1990, 1, 1), "Rome", null, "Italy", "Via Roma", "Italy",
                null, null, null, null, null, LocalDate.now(), "Trebinje");
        assertThatThrownBy(() -> guestService.addToReservation(reservationId,
                new AddReservationGuestRequest(null, invalidForeign, false), agent.getEmail()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Passport number");
    }

    @Test
    void cancellationClearsClaimAndDatabaseRejectsIncompleteDirectCheckIn() {
        AppUser manager = appUserRepository.save(user(
                "b04-cancel-manager@example.invalid", "9600000000006", UserRole.MANAGER));
        AppUser agent = appUserRepository.save(user(
                "b04-cancel-agent@example.invalid", "9600000000007", UserRole.AGENT));
        Integer reservationId = reservation(manager, agent, 1);

        checkInService.claim(reservationId, agent.getEmail());
        reservationService.changeStatus(reservationId,
                new ChangeReservationStatusRequest(ReservationStatus.CANCELLED, "Cancelled after claim"),
                manager.getEmail());

        assertThat(reservationService.findById(reservationId).checkInClaimedByUserId()).isNull();
        assertThat(checkInService.claimHistory(reservationId)).extracting("action")
                .containsExactly(
                        org.unibl.etf.blueStars.models.enums.CheckInClaimAction.RELEASED,
                        org.unibl.etf.blueStars.models.enums.CheckInClaimAction.CLAIMED);

        Integer secondReservation = reservation(manager, agent, 1);
        assertThatThrownBy(() -> jdbcTemplate.update(
                "update efikas.reservation set \"Status\" = 'CHECKED_IN', \"CheckedInBy\" = ?, \"CheckedInAt\" = now() where \"ReservationId\" = ?",
                agent.getUserId(), secondReservation))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("requires all guests");
    }

    private Integer reservation(AppUser manager, AppUser creator, int guestCount) {
        String suffix = creator.getUserId() + "-" + UUID.randomUUID().toString().substring(0, 8);
        var type = apartmentTypeService.create(new ApartmentTypeRequest(
                "B04 Type " + suffix, null, 4, new BigDecimal("125.00")));
        var apartment = apartmentService.create(new ApartmentRequest(
                "B04 Apartment " + suffix, "B04 address", 3, type.apartmentTypeId()), manager.getEmail());
        LocalDate today = LocalDate.now();
        return reservationService.create(new CreateReservationRequest(
                apartment.apartmentId(), today, today.plusDays(2), guestCount, null, null), creator.getEmail())
                .reservationId();
    }

    private static GuestRequest domesticGuest(String citizenId, String name) {
        return new GuestRequest(
                citizenId, true, null, name, "Domestic", Gender.Female, "+38765000000",
                LocalDate.of(1990, 1, 1), "Banja Luka", "Banja Luka", "Bosnia and Herzegovina",
                "Guest address", null, null, null, null, null, null, null, null);
    }

    private static GuestRequest foreignGuest(String citizenId, String name) {
        return new GuestRequest(
                citizenId, false, null, name, "Foreign", Gender.Female, "+491000000",
                LocalDate.of(1992, 2, 2), "Berlin", null, "Germany", "Guest address", "Germany",
                "PASS-B04", LocalDate.of(2020, 1, 1), null, null, LocalDate.now().plusDays(30),
                LocalDate.now(), "Sarajevo");
    }

    private static AppUser user(String email, String jmbg, UserRole role) {
        AppUser user = new AppUser();
        user.setName("B04");
        user.setSurname(role.name());
        user.setJmbg(jmbg);
        user.setPasswordHash("not-a-real-password-hash");
        user.setEmail(email);
        user.setRole(role);
        user.setAddress("B04 integration address");
        user.setActive(true);
        return user;
    }
}
