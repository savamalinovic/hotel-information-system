package org.unibl.etf.blueStars.controllers;

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
import org.unibl.etf.blueStars.configs.OpenApiConfig;
import org.unibl.etf.blueStars.models.enums.ReservationStatus;
import org.unibl.etf.blueStars.models.requests.ChangeReservationStatusRequest;
import org.unibl.etf.blueStars.models.requests.CreateReservationRequest;
import org.unibl.etf.blueStars.models.requests.AddReservationGuestRequest;
import org.unibl.etf.blueStars.models.requests.UpdateReservationGuestRequest;
import org.unibl.etf.blueStars.models.requests.UpdateReservationStayRequest;
import org.unibl.etf.blueStars.models.responses.*;
import org.unibl.etf.blueStars.services.ReservationService;
import org.unibl.etf.blueStars.services.CheckInService;
import org.unibl.etf.blueStars.services.GuestService;
import org.unibl.etf.blueStars.services.CheckOutService;

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
    private final GuestService guestService;
    private final CheckInService checkInService;
    private final CheckOutService checkOutService;

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

    @PostMapping("/{reservationId}/check-out")
    public CheckOutResponse checkOut(
            @PathVariable Integer reservationId,
            Authentication authentication
    ) {
        return checkOutService.checkOut(reservationId, authentication.getName());
    }

    @GetMapping("/{reservationId}/status-history")
    public List<ReservationStatusHistoryResponse> statusHistory(@PathVariable Integer reservationId) {
        return reservationService.statusHistory(reservationId);
    }

    @GetMapping("/{reservationId}/guests")
    public List<ReservationGuestResponse> guests(@PathVariable Integer reservationId) {
        return guestService.findReservationGuests(reservationId);
    }

    @PostMapping("/{reservationId}/guests")
    public ResponseEntity<ReservationGuestResponse> addGuest(
            @PathVariable Integer reservationId,
            @Valid @RequestBody AddReservationGuestRequest request,
            Authentication authentication
    ) {
        ReservationGuestResponse response = guestService.addToReservation(
                reservationId, request, authentication.getName());
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{guestId}")
                .buildAndExpand(response.guest().guestId()).toUri();
        return ResponseEntity.created(location).body(response);
    }

    @PutMapping("/{reservationId}/guests/{guestId}")
    public ReservationGuestResponse updateGuest(
            @PathVariable Integer reservationId,
            @PathVariable Integer guestId,
            @Valid @RequestBody UpdateReservationGuestRequest request
    ) {
        return guestService.updateForReservation(reservationId, guestId, request);
    }

    @DeleteMapping("/{reservationId}/guests/{guestId}")
    public ResponseEntity<Void> removeGuest(
            @PathVariable Integer reservationId,
            @PathVariable Integer guestId
    ) {
        guestService.removeFromReservation(reservationId, guestId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{reservationId}/check-in/claim")
    public CheckInClaimResponse claimCheckIn(
            @PathVariable Integer reservationId, Authentication authentication
    ) {
        return checkInService.claim(reservationId, authentication.getName());
    }

    @DeleteMapping("/{reservationId}/check-in/claim")
    public CheckInClaimResponse releaseCheckIn(
            @PathVariable Integer reservationId, Authentication authentication
    ) {
        return checkInService.release(reservationId, authentication.getName());
    }

    @PutMapping("/{reservationId}/check-in/claim")
    public CheckInClaimResponse takeoverCheckIn(
            @PathVariable Integer reservationId, Authentication authentication
    ) {
        return checkInService.takeover(reservationId, authentication.getName());
    }

    @GetMapping("/{reservationId}/check-in/claim-history")
    public List<CheckInClaimHistoryResponse> checkInClaimHistory(@PathVariable Integer reservationId) {
        return checkInService.claimHistory(reservationId);
    }

    @PostMapping("/{reservationId}/check-in")
    public CheckInResponse checkIn(
            @PathVariable Integer reservationId, Authentication authentication
    ) {
        return checkInService.checkIn(reservationId, authentication.getName());
    }
}
