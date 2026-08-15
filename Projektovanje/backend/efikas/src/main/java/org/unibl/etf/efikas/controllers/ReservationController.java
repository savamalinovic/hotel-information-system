package org.unibl.etf.efikas.controllers;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.unibl.etf.efikas.configs.OpenApiConfig;
import org.unibl.etf.efikas.models.enums.ReservationStatus;
import org.unibl.etf.efikas.models.requests.ChangeReservationStatusRequest;
import org.unibl.etf.efikas.models.requests.CreateReservationRequest;
import org.unibl.etf.efikas.models.requests.UpdateReservationStayRequest;
import org.unibl.etf.efikas.models.responses.*;
import org.unibl.etf.efikas.services.ReservationService;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1/reservations")
@RequiredArgsConstructor
@Tag(name = "Reservations")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class ReservationController {
    private final ReservationService reservationService;

    @GetMapping("/availability")
    public PageResponse<AvailableApartmentResponse> findAvailability(
            @RequestParam @NotNull LocalDate checkInDate,
            @RequestParam @NotNull LocalDate checkOutDate,
            @RequestParam @NotNull @Positive Integer guestCount,
            @RequestParam(required = false) Integer apartmentTypeId,
            @PageableDefault(size = 20, sort = "name") Pageable pageable
    ) {
        return reservationService.findAvailability(
                checkInDate, checkOutDate, guestCount, apartmentTypeId, pageable);
    }

    @GetMapping
    public PageResponse<ReservationDetailsResponse> findAll(
            @RequestParam(required = false) Integer apartmentId,
            @RequestParam(required = false) ReservationStatus status,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @PageableDefault(size = 20, sort = "checkInDate") Pageable pageable
    ) {
        return reservationService.findAll(apartmentId, status, from, to, pageable);
    }

    @GetMapping("/{reservationId}")
    public ReservationDetailsResponse findById(@PathVariable Integer reservationId) {
        return reservationService.findById(reservationId);
    }

    @PostMapping
    public ResponseEntity<ReservationDetailsResponse> create(
            @Valid @RequestBody CreateReservationRequest request,
            Authentication authentication
    ) {
        ReservationDetailsResponse response = reservationService.create(request, authentication.getName());
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}")
                .buildAndExpand(response.reservationId()).toUri();
        return ResponseEntity.created(location).body(response);
    }

    @PatchMapping("/{reservationId}/stay")
    public ReservationDetailsResponse updateStay(
            @PathVariable Integer reservationId,
            @Valid @RequestBody UpdateReservationStayRequest request,
            Authentication authentication
    ) {
        return reservationService.updateStay(reservationId, request, authentication.getName());
    }

    @PatchMapping("/{reservationId}/status")
    public ReservationDetailsResponse changeStatus(
            @PathVariable Integer reservationId,
            @Valid @RequestBody ChangeReservationStatusRequest request,
            Authentication authentication
    ) {
        return reservationService.changeStatus(reservationId, request, authentication.getName());
    }

    @GetMapping("/{reservationId}/status-history")
    public List<ReservationStatusHistoryResponse> statusHistory(@PathVariable Integer reservationId) {
        return reservationService.statusHistory(reservationId);
    }
}
