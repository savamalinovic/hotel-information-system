package org.unibl.etf.efikas.services;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.unibl.etf.efikas.models.entities.AppUser;
import org.unibl.etf.efikas.models.enums.UserRole;
import org.unibl.etf.efikas.repositories.AppUserRepository;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomUserDetailsServiceTest {

    @Mock
    private AppUserRepository appUserRepository;

    @InjectMocks
    private CustomUserDetailsService userDetailsService;

    @ParameterizedTest
    @EnumSource(UserRole.class)
    void mapsPersistedRoleToSingleSpringAuthority(UserRole role) {
        AppUser user = new AppUser();
        user.setEmail("role-test@example.invalid");
        user.setPasswordHash("encoded-password");
        user.setRole(role);
        when(appUserRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));

        UserDetails result = userDetailsService.loadUserByUsername(user.getEmail());

        assertThat(result.getAuthorities())
                .extracting("authority")
                .containsExactly(role.asAuthority());
    }
}
