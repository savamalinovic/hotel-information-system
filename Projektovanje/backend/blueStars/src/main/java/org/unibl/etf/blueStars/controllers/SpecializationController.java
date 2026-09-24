package org.unibl.etf.blueStars.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.unibl.etf.blueStars.configs.OpenApiConfig;
import org.unibl.etf.blueStars.models.responses.SpecializationResponse;
import org.unibl.etf.blueStars.services.SpecializationService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/specializations")
@RequiredArgsConstructor
@Tag(name = "Specializations", description = "Stable operational work-list catalog.")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class SpecializationController {
    private final SpecializationService specializationService;

    @GetMapping
    @Operation(summary = "List worker specializations")
    @PreAuthorize("isAuthenticated()")
    public List<SpecializationResponse> list() {
        return specializationService.list();
    }
}
