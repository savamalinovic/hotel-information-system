package org.unibl.etf.efikas.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.unibl.etf.efikas.configs.OpenApiConfig;
import org.unibl.etf.efikas.models.requests.UpdateHotelProfileRequest;
import org.unibl.etf.efikas.models.responses.HotelProfileResponse;
import org.unibl.etf.efikas.services.HotelProfileService;

@RestController
@RequestMapping("/api/v1/hotel-profile")
@RequiredArgsConstructor
@Tag(name = "Hotel profile", description = "The singleton hotel identity and document contact data.")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class HotelProfileController {
    private final HotelProfileService hotelProfileService;

    @GetMapping
    @Operation(summary = "Read the singleton hotel profile")
    @PreAuthorize("isAuthenticated()")
    public HotelProfileResponse get() {
        return hotelProfileService.getProfile();
    }

    @PutMapping
    @Operation(summary = "Update the singleton hotel profile")
    @PreAuthorize("hasRole('MANAGER')")
    public HotelProfileResponse update(@Valid @RequestBody UpdateHotelProfileRequest request) {
        return hotelProfileService.updateProfile(request);
    }
}
