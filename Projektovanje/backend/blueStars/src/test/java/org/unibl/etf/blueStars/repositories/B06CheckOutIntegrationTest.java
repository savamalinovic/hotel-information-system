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
import org.unibl.etf.blueStars.models.enums.*;
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
class B06CheckOutIntegrationTest {
    @Autowired CheckOutService checkOutService;
    @Autowired CheckInService checkInService;
    @Autowired GuestService guestService;
    @Autowired ReservationService reservationService;
    @Autowired ApartmentService apartmentService;
    @Autowired ApartmentTypeService apartmentTypeService;
    @Autowired AppUserRepository appUserRepository;
    @Autowired OperationalTaskRepository taskRepository;
    @Autowired JdbcTemplate jdbcTemplate;
    @MockitoBean S3Service s3Service;

    @Test
    void checksOutOnceAndCreatesExactlyOneCleaningTask() {
        Seed seed = checkedIn("success");

        var first = checkOutService.checkOut(seed.reservationId(), seed.agentEmail());
        var repeated = checkOutService.checkOut(seed.reservationId(), seed.agentEmail());

        assertThat(first.reservationStatus()).isEqualTo(ReservationStatus.CHECKED_OUT);
        assertThat(first.apartmentStatus()).isEqualTo(ApartmentOperationalStatus.DIRTY);
        assertThat(repeated.cleaningTaskId()).isEqualTo(first.cleaningTaskId());
        assertThat(taskRepository.findByReservationReservationIdAndSource(
                seed.reservationId(), TaskSource.CHECKOUT)).get().satisfies(task -> {
                    assertThat(task.getStatus()).isEqualTo(TaskStatus.NEW);
                    assertThat(task.getSpecialization().getCode()).isEqualTo("CLEANING");
                });
        assertThat(reservationService.statusHistory(seed.reservationId())).extracting("status")
                .containsExactly(ReservationStatus.CHECKED_OUT, ReservationStatus.CHECKED_IN,
                        ReservationStatus.CONFIRMED);
        assertThat(reservationService.findById(seed.reservationId()).checkedOutByUserId()).isNotNull();
    }

    @Test
    void rejectsInactiveStayAndDirectIncompleteDatabaseCheckout() {
        String suffix = suffix();
        AppUser manager = appUserRepository.save(user("m-" + suffix, UserRole.MANAGER));
        AppUser agent = appUserRepository.save(user("a-" + suffix, UserRole.AGENT));
        Integer confirmed = reservation(manager, agent, suffix);

        assertThatThrownBy(() -> checkOutService.checkOut(confirmed, agent.getEmail()))
                .isInstanceOf(DomainConflictException.class)
                .hasMessageContaining("active checked-in");

        Seed checkedIn = checkedIn("direct");
        assertThatThrownBy(() -> jdbcTemplate.update(
                "update efikas.reservation set \"Status\"='CHECKED_OUT', \"CheckedOutBy\"=?, \"CheckedOutAt\"=now() where \"ReservationId\"=?",
                agent.getUserId(), checkedIn.reservationId()))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("DIRTY");
    }

    private Seed checkedIn(String label) {
        String suffix = label + "-" + suffix();
        AppUser manager = appUserRepository.save(user("m-" + suffix, UserRole.MANAGER));
        AppUser agent = appUserRepository.save(user("a-" + suffix, UserRole.AGENT));
        Integer reservationId = reservation(manager, agent, suffix);
        guestService.addToReservation(reservationId,
                new AddReservationGuestRequest(null, guest("guest-" + suffix), true), agent.getEmail());
        checkInService.checkIn(reservationId, agent.getEmail());
        return new Seed(reservationId, agent.getEmail());
    }

    private Integer reservation(AppUser manager, AppUser agent, String suffix) {
        var type = apartmentTypeService.create(new ApartmentTypeRequest(
                "B06 Type " + suffix, null, 2, new BigDecimal("120.00")));
        var apartment = apartmentService.create(new ApartmentRequest(
                "B06 Apt " + suffix, "B06 address", 1, type.apartmentTypeId()), manager.getEmail());
        return reservationService.create(new CreateReservationRequest(
                apartment.apartmentId(), LocalDate.now(), LocalDate.now().plusDays(3),
                1, null, null), agent.getEmail()).reservationId();
    }

    private static GuestRequest guest(String citizenId) {
        return new GuestRequest(citizenId, true, null, "B06", "Guest", Gender.Female, null,
                LocalDate.of(1990, 1, 1), "Banja Luka", "Banja Luka", "Bosnia and Herzegovina",
                "Guest address", null, null, null, null, null, null, null, null);
    }

    private static AppUser user(String label, UserRole role) {
        AppUser user = new AppUser();
        user.setName("B06"); user.setSurname(role.name());
        user.setJmbg(String.format("%013d", Integer.toUnsignedLong(label.hashCode()) % 10_000_000_000_000L));
        user.setPasswordHash("hash"); user.setEmail("b06-" + label + "@example.invalid");
        user.setRole(role); user.setAddress("B06 address"); user.setActive(true);
        return user;
    }

    private static String suffix() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 10);
    }

    private record Seed(Integer reservationId, String agentEmail) {}
}
