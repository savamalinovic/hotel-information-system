package org.unibl.etf.efikas.services;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.unibl.etf.efikas.configs.properties.ManagerBootstrapProperties;
import org.unibl.etf.efikas.models.enums.UserRole;
import org.unibl.etf.efikas.models.requests.CreateManagedUserRequest;
import org.unibl.etf.efikas.repositories.AppUserRepository;

import java.util.Set;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "efikas.bootstrap.manager.enabled", havingValue = "true")
public class ManagerBootstrap implements ApplicationRunner {
    private final ManagerBootstrapProperties properties;
    private final AppUserRepository appUserRepository;
    private final UserManagementService userManagementService;
    private final Validator validator;

    @Override
    public void run(ApplicationArguments args) {
        if (appUserRepository.existsByRoleAndActiveTrue(UserRole.MANAGER)) {
            return;
        }

        CreateManagedUserRequest request = new CreateManagedUserRequest(
                properties.getEmail(),
                properties.getPassword(),
                properties.getName(),
                properties.getSurname(),
                properties.getJmbg(),
                properties.getAddress(),
                properties.getPhoneNumber(),
                UserRole.MANAGER,
                Set.of());

        Set<ConstraintViolation<CreateManagedUserRequest>> violations = validator.validate(request);
        if (!violations.isEmpty()) {
            String invalidFields = violations.stream()
                    .map(violation -> violation.getPropertyPath().toString())
                    .sorted()
                    .collect(Collectors.joining(", "));
            throw new IllegalStateException("Bootstrap manager configuration is invalid: " + invalidFields);
        }

        userManagementService.create(request);
    }
}
