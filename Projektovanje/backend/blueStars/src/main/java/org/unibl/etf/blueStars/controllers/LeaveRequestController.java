package org.unibl.etf.blueStars.controllers;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.unibl.etf.blueStars.configs.OpenApiConfig;
import org.unibl.etf.blueStars.models.enums.LeaveRequestStatus;
import org.unibl.etf.blueStars.models.requests.CreateLeaveRequest;
import org.unibl.etf.blueStars.models.requests.RejectLeaveRequest;
import org.unibl.etf.blueStars.models.responses.LeaveRequestResponse;
import org.unibl.etf.blueStars.models.responses.PageResponse;
import org.unibl.etf.blueStars.services.LeaveRequestService;

import java.net.URI;

@RestController
@RequestMapping("/api/v1/workforce")
@RequiredArgsConstructor
@Tag(name = "Workforce leave requests")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class LeaveRequestController {
    private final LeaveRequestService leaveRequestService;

    @PostMapping("/me/leave-requests")
    public ResponseEntity<LeaveRequestResponse> create(
            Authentication authentication, @Valid @RequestBody CreateLeaveRequest request
    ) {
        LeaveRequestResponse response = leaveRequestService.create(authentication.getName(), request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{requestId}")
                .buildAndExpand(response.leaveRequestId()).toUri();
        return ResponseEntity.created(location).body(response);
    }

    @GetMapping("/me/leave-requests")
    public PageResponse<LeaveRequestResponse> mine(
            Authentication authentication, @PageableDefault(size = 20, sort = "createdAt") Pageable pageable
    ) {
        return leaveRequestService.mine(authentication.getName(), pageable);
    }

    @PostMapping("/me/leave-requests/{requestId}/cancel")
    public LeaveRequestResponse cancel(Authentication authentication, @PathVariable Long requestId) {
        return leaveRequestService.cancel(authentication.getName(), requestId);
    }

    @GetMapping("/leave-requests")
    public PageResponse<LeaveRequestResponse> list(
            @RequestParam(required = false) Integer workerId,
            @RequestParam(required = false) LeaveRequestStatus status,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable
    ) {
        return leaveRequestService.list(workerId, status, pageable);
    }

    @PostMapping("/leave-requests/{requestId}/approve")
    public LeaveRequestResponse approve(Authentication authentication, @PathVariable Long requestId) {
        return leaveRequestService.approve(authentication.getName(), requestId);
    }

    @PostMapping("/leave-requests/{requestId}/reject")
    public LeaveRequestResponse reject(
            Authentication authentication, @PathVariable Long requestId,
            @Valid @RequestBody RejectLeaveRequest request
    ) {
        return leaveRequestService.reject(authentication.getName(), requestId, request.reason());
    }
}
