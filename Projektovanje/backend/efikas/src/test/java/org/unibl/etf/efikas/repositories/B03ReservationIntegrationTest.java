package org.unibl.etf.efikas.repositories;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.DataIntegrityViolationException;
import org.unibl.etf.efikas.exceptions.DomainConflictException;
import org.unibl.etf.efikas.models.entities.AppUser;
import org.unibl.etf.efikas.models.enums.ReservationStatus;
import org.unibl.etf.efikas.models.enums.UserRole;
import org.unibl.etf.efikas.models.requests.*;
import org.unibl.etf.efikas.services.ApartmentService;
import org.unibl.etf.efikas.services.ApartmentTypeService;
import org.unibl.etf.efikas.services.ReservationService;
import org.unibl.etf.efikas.services.interfaces.S3Service;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class B03ReservationIntegrationTest {
    @Autowired ReservationService reservationService;
    @Autowired ApartmentService apartmentService;
    @Autowired ApartmentTypeService apartmentTypeService;
    @Autowired AppUserRepository appUserRepository;
    @Autowired JdbcTemplate jdbcTemplate;

    @MockitoBean S3Service s3Service;

    @Test
    void snapshotsPriceAndAvailabilityUsesHalfOpenStayPeriods() {
        AppUser manager = appUserRepository.save(manager("b03-price@example.invalid", "9700000000001"));
        var type = apartmentTypeService.create(new ApartmentTypeRequest(
                "B03 Suite", null, 3, new BigDecimal("100.00")));
        var first = apartmentService.create(
                new ApartmentRequest("B03-201", "Address 201", 2, type.apartmentTypeId()), manager.getEmail());
        var second = apartmentService.create(
                new ApartmentRequest("B03-202", "Address 202", 2, type.apartmentTypeId()), manager.getEmail());
        LocalDate checkIn = LocalDate.now().plusDays(10);
        LocalDate checkOut = checkIn.plusDays(3);

        var reservation = reservationService.create(new CreateReservationRequest(
                first.apartmentId(), checkIn, checkOut, 2, null, "Price snapshot"), manager.getEmail());
        apartmentTypeService.update(type.apartmentTypeId(), new ApartmentTypeRequest(
                "B03 Suite", null, 3, new BigDecimal("150.00")));

        assertThat(reservationService.findById(reservation.reservationId()).nightlyRate())
                .isEqualByComparingTo("100.00");
        assertThat(reservation.totalPrice()).isEqualByComparingTo("300.00");
        assertThat(reservationService.findAvailability(checkIn, checkOut, 2, type.apartmentTypeId(),
                org.springframework.data.domain.Pageable.unpaged()).content())
                .extracting("apartmentId")
                .containsExactly(second.apartmentId());

        var adjacent = reservationService.create(new CreateReservationRequest(
                first.apartmentId(), checkOut, checkOut.plusDays(2), 1, null, null), manager.getEmail());
        assertThat(adjacent).isNotNull();
        assertThatThrownBy(() -> reservationService.updateStay(
                reservation.reservationId(), new UpdateReservationStayRequest(checkOut.plusDays(1)), manager.getEmail()))
                .isInstanceOf(DomainConflictException.class);
    }

    @Test
    void validatesCapacityAndReservationUnavailabilityConflictBothWays() {
        AppUser manager = appUserRepository.save(manager("b03-conflict@example.invalid", "9700000000002"));
        var type = apartmentTypeService.create(new ApartmentTypeRequest(
                "B03 Studio", null, 2, new BigDecimal("70.00")));
        var apartment = apartmentService.create(
                new ApartmentRequest("B03-203", "Address 203", null, type.apartmentTypeId()), manager.getEmail());
        LocalDate checkIn = LocalDate.now().plusDays(20);
        LocalDate checkOut = checkIn.plusDays(2);

        assertThatThrownBy(() -> reservationService.create(new CreateReservationRequest(
                apartment.apartmentId(), checkIn, checkOut, 3, null, null), manager.getEmail()))
                .isInstanceOf(DomainConflictException.class)
                .hasMessageContaining("capacity");

        reservationService.create(new CreateReservationRequest(
                apartment.apartmentId(), checkIn, checkOut, 2, null, null), manager.getEmail());
        assertThatThrownBy(() -> apartmentService.deactivate(apartment.apartmentId()))
                .isInstanceOf(DomainConflictException.class)
                .hasMessageContaining("cannot be deactivated");
        assertThatThrownBy(() -> apartmentService.addUnavailability(apartment.apartmentId(),
                new ApartmentUnavailabilityRequest(checkIn, checkIn, "Emergency repair"), manager.getEmail()))
                .isInstanceOf(DomainConflictException.class)
                .hasMessageContaining("reservation");
    }

    @Test
    void cancellationIsAuditedAndReleasesAvailability() {
        AppUser manager = appUserRepository.save(manager("b03-status@example.invalid", "9700000000003"));
        var type = apartmentTypeService.create(new ApartmentTypeRequest(
                "B03 Family", null, 5, new BigDecimal("180.00")));
        var apartment = apartmentService.create(
                new ApartmentRequest("B03-204", "Address 204", 1, type.apartmentTypeId()), manager.getEmail());
        LocalDate checkIn = LocalDate.now().plusDays(30);
        LocalDate checkOut = checkIn.plusDays(4);
        var reservation = reservationService.create(new CreateReservationRequest(
                apartment.apartmentId(), checkIn, checkOut, 4, null, null), manager.getEmail());

        reservationService.changeStatus(reservation.reservationId(),
                new ChangeReservationStatusRequest(ReservationStatus.CANCELLED, "Guest cancelled"),
                manager.getEmail());

        assertThat(reservationService.statusHistory(reservation.reservationId()))
                .extracting("status")
                .containsExactly(ReservationStatus.CANCELLED, ReservationStatus.CONFIRMED);
        assertThat(reservationService.findAvailability(checkIn, checkOut, 4, type.apartmentTypeId(),
                org.springframework.data.domain.Pageable.unpaged()).content())
                .extracting("apartmentId")
                .contains(apartment.apartmentId());
    }

    @Test
    void databaseRejectsChangingTheReservedApartment() {
        AppUser manager = appUserRepository.save(manager("b03-immutable@example.invalid", "9700000000004"));
        var type = apartmentTypeService.create(new ApartmentTypeRequest(
                "B03 Immutable", null, 2, new BigDecimal("110.00")));
        var first = apartmentService.create(
                new ApartmentRequest("B03-205", "Address 205", null, type.apartmentTypeId()), manager.getEmail());
        var second = apartmentService.create(
                new ApartmentRequest("B03-206", "Address 206", null, type.apartmentTypeId()), manager.getEmail());
        LocalDate checkIn = LocalDate.now().plusDays(40);
        var reservation = reservationService.create(new CreateReservationRequest(
                first.apartmentId(), checkIn, checkIn.plusDays(2), 1, null, null), manager.getEmail());

        assertThatThrownBy(() -> jdbcTemplate.update(
                "update efikas.reservation set \"ApartmentId\" = ? where \"ReservationId\" = ?",
                second.apartmentId(), reservation.reservationId()))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("cannot be changed");
    }

    private static AppUser manager(String email, String jmbg) {
        AppUser user = new AppUser();
        user.setName("B03");
        user.setSurname("Manager");
        user.setJmbg(jmbg);
        user.setPasswordHash("not-a-real-password-hash");
        user.setEmail(email);
        user.setRole(UserRole.MANAGER);
        user.setAddress("Integration test address");
        user.setActive(true);
        return user;
    }
}
