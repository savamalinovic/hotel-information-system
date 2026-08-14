package org.unibl.etf.efikas.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.unibl.etf.efikas.models.entities.AppUser;
import org.unibl.etf.efikas.models.enums.UserRole;
import org.unibl.etf.efikas.models.requests.RegistrationRequest;
import org.unibl.etf.efikas.repositories.AppUserRepository;
import org.unibl.etf.efikas.services.interfaces.OtpService;

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

        when(appUserRepository.existsByEmail(request.getEmail())).thenReturn(false);
        when(modelMapper.map(request, AppUser.class)).thenReturn(new AppUser());
        when(passwordEncoder.encode(request.getPassword())).thenReturn("encoded-password");
        when(appUserRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assertThat(appUserService.register(request)).isEmpty();

        ArgumentCaptor<AppUser> savedUser = ArgumentCaptor.forClass(AppUser.class);
        verify(appUserRepository).save(savedUser.capture());
        assertThat(savedUser.getValue().getRole()).isEqualTo(UserRole.AGENT);
    }
}
