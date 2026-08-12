package org.unibl.etf.efikas.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.unibl.etf.efikas.configs.OpenApiConfig;
import org.unibl.etf.efikas.models.responses.AnalyticsResponse;
import org.unibl.etf.efikas.services.AnalyticsService;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
@Tag(name = "Analytics", description = "Manager-only hotel analytics")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class AnalyticsController {
    private final AnalyticsService service;

    @GetMapping
    @Operation(summary = "Read analytics for an inclusive date period",
            description = "Omit both dates for the current month; otherwise both from and to are required.")
    public AnalyticsResponse summary(
            Authentication authentication,
            @Parameter(description = "Inclusive first date (YYYY-MM-DD)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @Parameter(description = "Inclusive last date (YYYY-MM-DD)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return service.summary(authentication.getName(), from, to);
    }
}
