package org.unibl.etf.blueStars.repositories;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.blueStars.exceptions.DomainConflictException;
import org.unibl.etf.blueStars.models.entities.AppUser;
import org.unibl.etf.blueStars.models.enums.ApartmentEffectiveStatus;
import org.unibl.etf.blueStars.models.enums.ApartmentOperationalStatus;
import org.unibl.etf.blueStars.models.enums.UserRole;
import org.unibl.etf.blueStars.models.requests.ApartmentRequest;
import org.unibl.etf.blueStars.models.requests.ApartmentStatusRequest;
import org.unibl.etf.blueStars.models.requests.ApartmentTypeRequest;
import org.unibl.etf.blueStars.models.requests.ApartmentUnavailabilityRequest;
import org.unibl.etf.blueStars.services.ApartmentService;
import org.unibl.etf.blueStars.services.ApartmentTypeService;
import org.unibl.etf.blueStars.services.interfaces.S3Service;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class B02ApartmentCatalogIntegrationTest {
    @Autowired
    private ApartmentTypeService apartmentTypeService;

    @Autowired
    private ApartmentService apartmentService;

    @Autowired
    private AppUserRepository appUserRepository;

    @MockitoBean
    private S3Service s3Service;

    @Test
    void storesExactDefaultRateAndDerivesOutOfOrderFromCurrentPeriod() {
        AppUser manager = appUserRepository.save(manager("b02-period@example.invalid", "9800000000001"));
        var type = apartmentTypeService.create(new ApartmentTypeRequest(
                "B02 Deluxe", "Integration test", 4, new BigDecimal("123.45")));
        var apartment = apartmentService.create(new ApartmentRequest(
                "B02-101", "Test address 1", 1, type.apartmentTypeId()), manager.getEmail());

        LocalDate today = LocalDate.now();
        apartmentService.addUnavailability(apartment.apartmentId(),
                new ApartmentUnavailabilityRequest(today.minusDays(1), today.plusDays(1), "Planned repair"),
                manager.getEmail());

        var response = apartmentService.findDetails(apartment.apartmentId());
        assertThat(response.type().defaultNightlyRate()).isEqualByComparingTo("123.45");
        assertThat(response.operationalStatus()).isEqualTo(ApartmentOperationalStatus.READY);
        assertThat(response.effectiveStatus()).isEqualTo(ApartmentEffectiveStatus.OUT_OF_ORDER);
    }

    @Test
    void rejectsOverlappingPeriodsAndRecordsActualStatusChanges() {
        AppUser manager = appUserRepository.save(manager("b02-history@example.invalid", "9800000000002"));
        var type = apartmentTypeService.create(new ApartmentTypeRequest(
                "B02 Studio", null, 2, new BigDecimal("80.00")));
        var apartment = apartmentService.create(new ApartmentRequest(
                "B02-102", "Test address 2", null, type.apartmentTypeId()), manager.getEmail());
        LocalDate today = LocalDate.now();

        apartmentService.addUnavailability(apartment.apartmentId(),
                new ApartmentUnavailabilityRequest(today.plusDays(5), today.plusDays(7), "First repair"),
                manager.getEmail());
        assertThatThrownBy(() -> apartmentService.addUnavailability(apartment.apartmentId(),
                new ApartmentUnavailabilityRequest(today.plusDays(7), today.plusDays(9), "Overlap"),
                manager.getEmail()))
                .isInstanceOf(DomainConflictException.class);

        apartmentService.changeStatus(apartment.apartmentId(),
                new ApartmentStatusRequest(ApartmentOperationalStatus.CLEANING, "Guest checked out"),
                manager.getEmail());
        apartmentService.changeStatus(apartment.apartmentId(),
                new ApartmentStatusRequest(ApartmentOperationalStatus.CLEANING, "Duplicate event"),
                manager.getEmail());

        assertThat(apartmentService.statusHistory(apartment.apartmentId()))
                .extracting("status")
                .containsExactly(ApartmentOperationalStatus.CLEANING, ApartmentOperationalStatus.READY);
    }

    private static AppUser manager(String email, String jmbg) {
        AppUser user = new AppUser();
        user.setName("B02");
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
