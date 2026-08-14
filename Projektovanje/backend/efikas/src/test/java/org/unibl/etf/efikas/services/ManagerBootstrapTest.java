package org.unibl.etf.efikas.services;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.unibl.etf.efikas.configs.properties.ManagerBootstrapProperties;
import org.unibl.etf.efikas.models.enums.UserRole;
import org.unibl.etf.efikas.repositories.AppUserRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ManagerBootstrapTest {
    private static ValidatorFactory validatorFactory;
    private static Validator validator;

    @BeforeAll
    static void createValidator() {
        validatorFactory = Validation.buildDefaultValidatorFactory();
        validator = validatorFactory.getValidator();
    }

    @AfterAll
    static void closeValidator() {
        validatorFactory.close();
    }

    @Test
    void createsFirstManagerFromValidatedExternalConfiguration() throws Exception {
        ManagerBootstrapProperties properties = validProperties();
        AppUserRepository appUserRepository = mock(AppUserRepository.class);
        UserManagementService userManagementService = mock(UserManagementService.class);
        when(appUserRepository.existsByRoleAndActiveTrue(UserRole.MANAGER)).thenReturn(false);

        new ManagerBootstrap(properties, appUserRepository, userManagementService, validator).run(null);

        var requestCaptor = org.mockito.ArgumentCaptor.forClass(
                org.unibl.etf.efikas.models.requests.CreateManagedUserRequest.class);
        verify(userManagementService).create(requestCaptor.capture());
        assertThat(requestCaptor.getValue().role()).isEqualTo(UserRole.MANAGER);
        assertThat(requestCaptor.getValue().email()).isEqualTo("first-manager@example.invalid");
    }

    @Test
    void doesNothingWhenAnActiveManagerAlreadyExists() throws Exception {
        AppUserRepository appUserRepository = mock(AppUserRepository.class);
        UserManagementService userManagementService = mock(UserManagementService.class);
        when(appUserRepository.existsByRoleAndActiveTrue(UserRole.MANAGER)).thenReturn(true);

        new ManagerBootstrap(new ManagerBootstrapProperties(), appUserRepository, userManagementService, validator)
                .run(null);

        verify(userManagementService, never()).create(any());
    }

    private static ManagerBootstrapProperties validProperties() {
        ManagerBootstrapProperties properties = new ManagerBootstrapProperties();
        properties.setEmail("first-manager@example.invalid");
        properties.setPassword("temporary-strong-password");
        properties.setName("First");
        properties.setSurname("Manager");
        properties.setJmbg("9911111111111");
        properties.setAddress("Hotel bootstrap address");
        properties.setPhoneNumber("+38765111222");
        return properties;
    }
}
