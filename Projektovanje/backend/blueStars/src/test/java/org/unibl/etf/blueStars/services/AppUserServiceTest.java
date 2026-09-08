package org.unibl.etf.blueStars.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.unibl.etf.blueStars.models.entities.AppUser;
import org.unibl.etf.blueStars.models.dto.UserDTO;
import org.unibl.etf.blueStars.models.enums.UserRole;
import org.unibl.etf.blueStars.models.requests.RegistrationRequest;
import org.unibl.etf.blueStars.models.responses.AppUserResponse;
import org.unibl.etf.blueStars.repositories.AppUserRepository;
import org.unibl.etf.blueStars.services.interfaces.OtpService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AppUserServiceTest {

    @Mock
    private AppUserRepository appUserRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private OtpService otpService;
    @Mock
    private ModelMapper modelMapper;

    @InjectMocks
    private AppUserService appUserService;

    @Test
    void registrationServiceDefaultsToAgent() {
        RegistrationRequest request = new RegistrationRequest();
        request.setEmail("new-agent@example.invalid");
        request.setPassword("plain-password");

        when(appUserRepository.existsByEmailIgnoreCase(request.getEmail())).thenReturn(false);
        when(modelMapper.map(request, AppUser.class)).thenReturn(new AppUser());
        when(passwordEncoder.encode(request.getPassword())).thenReturn("encoded-password");
        when(appUserRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assertThat(appUserService.register(request)).isEmpty();

        ArgumentCaptor<AppUser> savedUser = ArgumentCaptor.forClass(AppUser.class);
        verify(appUserRepository).save(savedUser.capture());
        assertThat(savedUser.getValue().getRole()).isEqualTo(UserRole.AGENT);
    }

    @Test
    void inactiveUserCannotAuthenticate() {
        AppUser user = new AppUser();
        user.setEmail("inactive@example.invalid");
        user.setPasswordHash("encoded-password");
        user.setActive(false);
        when(appUserRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(java.util.Optional.of(user));

        assertThat(appUserService.authenticate(user.getEmail(), "plain-password")).isFalse();
    }

    @Test
    void currentUserInfoUsesTheAuthenticatedIdentityAndMapsItsStableId() {
        AppUser user = user(123, "agent@example.invalid", UserRole.AGENT);
        AppUserResponse mapped = new AppUserResponse();
        when(appUserRepository.findByEmailIgnoreCase("agent@example.invalid")).thenReturn(java.util.Optional.of(user));
        when(modelMapper.map(user, AppUserResponse.class)).thenReturn(mapped);

        AppUserResponse response = appUserService.getCurrentUserInfo(
                new UsernamePasswordAuthenticationToken("agent@example.invalid", "ignored"));

        assertThat(response.getUserId()).isEqualTo(123);
        verify(appUserRepository).findByEmailIgnoreCase("agent@example.invalid");
    }

    @Test
    void profileUpdateKeepsTheExistingUserIdInItsMappedResponse() {
        AppUser user = user(456, "manager@example.invalid", UserRole.MANAGER);
        UserDTO update = new UserDTO();
        update.setName("Updated"); update.setSurname("Manager"); update.setJmbg("1234567890123");
        update.setEmail("updated-manager@example.invalid"); update.setAddress("Updated address");
        AppUserResponse mapped = new AppUserResponse();
        mapped.setEmail(update.getEmail());
        when(appUserRepository.findByEmailIgnoreCase("manager@example.invalid")).thenReturn(java.util.Optional.of(user));
        when(appUserRepository.save(user)).thenReturn(user);
        when(modelMapper.map(user, AppUserResponse.class)).thenReturn(mapped);

        AppUserResponse response = appUserService.updateUserAccount(update,
                new UsernamePasswordAuthenticationToken("manager@example.invalid", "ignored"));

        assertThat(response.getUserId()).isEqualTo(456);
        assertThat(response.getEmail()).isEqualTo("updated-manager@example.invalid");
    }

    private static AppUser user(int userId, String email, UserRole role) {
        AppUser user = new AppUser();
        user.setUserId(userId); user.setEmail(email); user.setRole(role); user.setActive(true);
        return user;
    }
}
