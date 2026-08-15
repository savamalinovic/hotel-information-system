package org.unibl.etf.efikas.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.unibl.etf.efikas.models.entities.AppUser;
import org.unibl.etf.efikas.models.enums.UserRole;
import org.unibl.etf.efikas.repositories.AnalyticsReadRepository;
import org.unibl.etf.efikas.repositories.AppUserRepository;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class B16AnalyticsServiceTest {
    @Mock AnalyticsReadRepository analytics;
    @Mock AppUserRepository users;
    @Mock WorkforceAvailabilityService workforce;

    @Test
    void resolvesDefaultAndExplicitPeriodsAndRejectsInvalidInput() {
        LocalDate today = LocalDate.now();
        assertThat(AnalyticsService.resolvePeriod(null, null))
                .isEqualTo(new org.unibl.etf.efikas.models.responses.AnalyticsResponse.Period(
                        today.withDayOfMonth(1), today));
        assertThat(AnalyticsService.resolvePeriod(LocalDate.of(2026, 1, 3), LocalDate.of(2026, 1, 9)))
                .extracting("from", "to")
                .containsExactly(LocalDate.of(2026, 1, 3), LocalDate.of(2026, 1, 9));
        assertThatThrownBy(() -> AnalyticsService.resolvePeriod(LocalDate.now(), null))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("together");
        assertThatThrownBy(() -> AnalyticsService.resolvePeriod(
                LocalDate.of(2026, 2, 2), LocalDate.of(2026, 2, 1)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("after");
    }

    @Test
    void inactiveManagerAndOtherRolesAreRejectedInServiceToo() {
        AnalyticsService service = new AnalyticsService(analytics, users, workforce);
        AppUser agent = user(UserRole.AGENT, true);
        when(users.findByEmailIgnoreCase("agent@test.invalid")).thenReturn(Optional.of(agent));
        assertThatThrownBy(() -> service.summary("agent@test.invalid", null, null))
                .isInstanceOf(AccessDeniedException.class);

        AppUser inactiveManager = user(UserRole.MANAGER, false);
        when(users.findByEmailIgnoreCase("manager@test.invalid")).thenReturn(Optional.of(inactiveManager));
        assertThatThrownBy(() -> service.summary("manager@test.invalid", null, null))
                .isInstanceOf(AccessDeniedException.class);
    }

    private AppUser user(UserRole role, boolean active) {
        AppUser user = new AppUser();
        user.setRole(role);
        user.setActive(active);
        return user;
    }
}
