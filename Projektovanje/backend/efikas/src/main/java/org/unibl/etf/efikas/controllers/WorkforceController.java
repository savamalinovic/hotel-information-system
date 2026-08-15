package org.unibl.etf.efikas.controllers;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.unibl.etf.efikas.configs.OpenApiConfig;
import org.unibl.etf.efikas.models.requests.CreateAvailabilityOverrideRequest;
import org.unibl.etf.efikas.models.responses.AttendanceSessionResponse;
import org.unibl.etf.efikas.models.responses.AvailabilityOverrideResponse;
import org.unibl.etf.efikas.models.responses.PageResponse;
import org.unibl.etf.efikas.models.responses.WorkerAvailabilityResponse;
import org.unibl.etf.efikas.services.WorkforceAvailabilityService;

import java.net.URI;

@RestController
@RequestMapping("/api/v1/workforce")
@RequiredArgsConstructor
@Tag(name = "Workforce attendance and availability")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class WorkforceController {
    private final WorkforceAvailabilityService workforceAvailabilityService;

    @GetMapping("/availability")
    public PageResponse<WorkerAvailabilityResponse> workersAvailability(
            @PageableDefault(size = 20, sort = {"surname", "name"}) Pageable pageable
    ) {
        return workforceAvailabilityService.currentWorkers(pageable);
    }

    @GetMapping("/me/availability")
    public WorkerAvailabilityResponse myAvailability(Authentication authentication) {
        return workforceAvailabilityService.current(authentication.getName());
    }

    @PostMapping("/me/attendance/clock-in")
    public WorkerAvailabilityResponse clockIn(Authentication authentication) {
        return workforceAvailabilityService.clockIn(authentication.getName());
    }

    @PostMapping("/me/attendance/breaks/start")
    public WorkerAvailabilityResponse startBreak(Authentication authentication) {
        return workforceAvailabilityService.startBreak(authentication.getName());
    }

    @PostMapping("/me/attendance/breaks/end")
    public WorkerAvailabilityResponse endBreak(Authentication authentication) {
        return workforceAvailabilityService.endBreak(authentication.getName());
    }

    @PostMapping("/me/attendance/clock-out")
    public WorkerAvailabilityResponse clockOut(Authentication authentication) {
        return workforceAvailabilityService.clockOut(authentication.getName());
    }

    @GetMapping("/me/attendance-sessions")
    public PageResponse<AttendanceSessionResponse> attendanceHistory(
            Authentication authentication,
            @PageableDefault(size = 20, sort = "clockedInAt") Pageable pageable
    ) {
        return workforceAvailabilityService.attendanceHistory(authentication.getName(), pageable);
    }

    @GetMapping("/me/availability-overrides")
    public PageResponse<AvailabilityOverrideResponse> overrideHistory(
            Authentication authentication,
            @PageableDefault(size = 20, sort = "startsAt") Pageable pageable
    ) {
        return workforceAvailabilityService.overrideHistory(authentication.getName(), pageable);
    }

    @PostMapping("/me/availability-overrides")
    public ResponseEntity<AvailabilityOverrideResponse> createOverride(
            @Valid @RequestBody CreateAvailabilityOverrideRequest request,
            Authentication authentication
    ) {
        AvailabilityOverrideResponse response = workforceAvailabilityService.createOverride(
                authentication.getName(), request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{overrideId}")
                .buildAndExpand(response.availabilityOverrideId()).toUri();
        return ResponseEntity.created(location).body(response);
    }

    @PostMapping("/me/availability-overrides/{overrideId}/clear")
    public AvailabilityOverrideResponse clearOverride(
            @PathVariable Long overrideId, Authentication authentication
    ) {
        return workforceAvailabilityService.clearOverride(authentication.getName(), overrideId);
    }
}
