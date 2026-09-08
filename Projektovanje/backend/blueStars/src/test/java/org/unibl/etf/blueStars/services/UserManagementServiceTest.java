package org.unibl.etf.blueStars.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.unibl.etf.blueStars.exceptions.DomainConflictException;
import org.unibl.etf.blueStars.models.entities.AppUser;
import org.unibl.etf.blueStars.models.entities.Specialization;
import org.unibl.etf.blueStars.models.enums.UserRole;
import org.unibl.etf.blueStars.models.requests.CreateManagedUserRequest;
import org.unibl.etf.blueStars.repositories.AppUserRepository;
import org.unibl.etf.blueStars.repositories.SpecializationRepository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserManagementServiceTest {
    @Mock
    private AppUserRepository appUserRepository;
    @Mock
    private SpecializationRepository specializationRepository;
    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserManagementService userManagementService;

    @Test
    void managerCanCreateWorkerWithNormalizedIdentityAndSpecialization() {
        Specialization cleaning = new Specialization();
        cleaning.setSpecializationId((short) 1);
        cleaning.setCode("CLEANING");
        cleaning.setName("Čišćenje");
        when(specializationRepository.findAllById(Set.of((short) 1))).thenReturn(List.of(cleaning));
        when(passwordEncoder.encode("strong-password")).thenReturn("encoded-password");
        when(appUserRepository.save(any(AppUser.class))).thenAnswer(invocation -> {
            AppUser user = invocation.getArgument(0);
            user.setUserId(42);
            return user;
        });

        var response = userManagementService.create(new CreateManagedUserRequest(
                " Worker@Example.com ",
                "strong-password",
                "Radnik",
                "Primjer",
                "1234567890123",
                "Hotelska adresa 1",
                "065/123-456",
                UserRole.OPERATIONAL_WORKER,
                Set.of((short) 1)));

        assertThat(response.id()).isEqualTo(42);
        assertThat(response.email()).isEqualTo("worker@example.com");
        assertThat(response.phoneNumber()).isEqualTo("+38765123456");
        assertThat(response.specializations()).extracting("code").containsExactly("CLEANING");
        verify(passwordEncoder).encode("strong-password");
    }

    @Test
    void nonWorkerCannotReceiveSpecializations() {
        assertThatThrownBy(() -> userManagementService.create(new CreateManagedUserRequest(
                "agent@example.com",
                "strong-password",
                "Agent",
                "Primjer",
                "1234567890123",
                "Hotelska adresa 1",
                null,
                UserRole.AGENT,
                Set.of((short) 1))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Only operational workers can have specializations.");
    }

    @Test
    void lastActiveManagerCannotBeDeactivated() {
        AppUser manager = new AppUser();
        manager.setUserId(7);
        manager.setRole(UserRole.MANAGER);
        manager.setActive(true);
        when(appUserRepository.findById(7)).thenReturn(Optional.of(manager));
        when(appUserRepository.findActiveByRoleForUpdate(UserRole.MANAGER)).thenReturn(List.of(manager));

        assertThatThrownBy(() -> userManagementService.setActive(7, false))
                .isInstanceOf(DomainConflictException.class)
                .hasMessage("The last active manager cannot be deactivated or reassigned.");
    }
}
