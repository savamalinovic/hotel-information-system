package org.unibl.etf.efikas.repositories;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.efikas.models.entities.AppUser;
import org.unibl.etf.efikas.models.entities.HotelProfile;
import org.unibl.etf.efikas.models.enums.UserRole;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class B01DomainRepositoryTest {
    @Autowired
    private HotelProfileRepository hotelProfileRepository;

    @Autowired
    private SpecializationRepository specializationRepository;

    @Autowired
    private AppUserRepository appUserRepository;

    @Test
    void migrationSeedsExactlyOneHotelAndStableSpecializationCatalog() {
        assertThat(hotelProfileRepository.findAll())
                .singleElement()
                .extracting(HotelProfile::getHotelProfileId)
                .isEqualTo(HotelProfile.SINGLETON_ID);

        assertThat(specializationRepository.findAllByOrderByCodeAsc())
                .extracting("code")
                .containsExactlyInAnyOrderElementsOf(Set.of(
                        "CLEANING",
                        "ELECTRICAL",
                        "PLUMBING",
                        "GENERAL_MAINTENANCE",
                        "INSPECTION",
                        "APARTMENT_PREPARATION"));
    }

    @Test
    void databaseRejectsDuplicateJmbg() {
        appUserRepository.saveAndFlush(user("b01-one@example.invalid", "9900000000001"));

        assertThatThrownBy(() -> appUserRepository.saveAndFlush(
                user("b01-two@example.invalid", "9900000000001")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private static AppUser user(String email, String jmbg) {
        AppUser user = new AppUser();
        user.setName("B01");
        user.setSurname("Integration");
        user.setJmbg(jmbg);
        user.setPasswordHash("not-a-real-password-hash");
        user.setEmail(email);
        user.setRole(UserRole.AGENT);
        user.setAddress("Integration test address");
        user.setActive(true);
        return user;
    }
}
