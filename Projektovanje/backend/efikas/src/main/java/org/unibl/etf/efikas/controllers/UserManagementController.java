package org.unibl.etf.efikas.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.unibl.etf.efikas.configs.OpenApiConfig;
import org.unibl.etf.efikas.models.enums.UserRole;
import org.unibl.etf.efikas.models.requests.AssignSpecializationsRequest;
import org.unibl.etf.efikas.models.requests.CreateManagedUserRequest;
import org.unibl.etf.efikas.models.requests.UpdateManagedUserRequest;
import org.unibl.etf.efikas.models.requests.UpdateUserStatusRequest;
import org.unibl.etf.efikas.models.responses.ManagedUserResponse;
import org.unibl.etf.efikas.models.responses.PageResponse;
import org.unibl.etf.efikas.services.UserManagementService;

import java.net.URI;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Validated
@PreAuthorize("hasRole('MANAGER')")
@Tag(name = "User management", description = "Manager-controlled account lifecycle and worker specializations.")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class UserManagementController {
    private final UserManagementService userManagementService;

    @GetMapping
    @Operation(summary = "List users with optional role and status filters")
    public PageResponse<ManagedUserResponse> list(
            @RequestParam(required = false) UserRole role,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size
    ) {
        return userManagementService.list(role, active, page, size);
    }

    @GetMapping("/{userId}")
    @Operation(summary = "Read a managed user")
    public ManagedUserResponse get(@PathVariable @Min(1) Integer userId) {
        return userManagementService.get(userId);
    }

    @PostMapping
    @Operation(summary = "Create an active user account")
    public ResponseEntity<ManagedUserResponse> create(@Valid @RequestBody CreateManagedUserRequest request) {
        ManagedUserResponse response = userManagementService.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{userId}")
                .buildAndExpand(response.id())
                .toUri();
        return ResponseEntity.created(location).body(response);
    }

    @PutMapping("/{userId}")
    @Operation(summary = "Update user identity and role")
    public ManagedUserResponse update(
            @PathVariable @Min(1) Integer userId,
            @Valid @RequestBody UpdateManagedUserRequest request
    ) {
        return userManagementService.update(userId, request);
    }

    @PatchMapping("/{userId}/status")
    @Operation(summary = "Activate or deactivate a user without deleting audit identity")
    public ManagedUserResponse setStatus(
            @PathVariable @Min(1) Integer userId,
            @Valid @RequestBody UpdateUserStatusRequest request
    ) {
        return userManagementService.setActive(userId, request.active());
    }

    @PutMapping("/{userId}/specializations")
    @Operation(summary = "Replace an operational worker's specialization assignments")
    public ManagedUserResponse assignSpecializations(
            @PathVariable @Min(1) Integer userId,
            @Valid @RequestBody AssignSpecializationsRequest request
    ) {
        return userManagementService.assignSpecializations(userId, request.specializationIds());
    }
}
