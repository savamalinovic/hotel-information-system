package org.unibl.etf.blueStars.controllers;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.unibl.etf.blueStars.configs.OpenApiConfig;
import org.unibl.etf.blueStars.models.enums.ApartmentOperationalStatus;
import org.unibl.etf.blueStars.models.requests.*;
import org.unibl.etf.blueStars.models.responses.*;
import org.unibl.etf.blueStars.services.ApartmentService;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/apartments")
@RequiredArgsConstructor
@Tag(name = "Apartments")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class ApartmentController {
    private final ApartmentService apartmentService;

    @GetMapping
    public PageResponse<ApartmentDetailsResponse> findAll(
            @RequestParam(required = false) Integer apartmentTypeId,
            @RequestParam(required = false) ApartmentOperationalStatus status,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) Boolean outOfOrder,
            @PageableDefault(size = 20, sort = "name") Pageable pageable
    ) {
        return apartmentService.findAll(apartmentTypeId, status, active, outOfOrder, pageable);
    }

    @GetMapping("/{id}")
    public ApartmentDetailsResponse findById(@PathVariable Integer id) {
        return apartmentService.findDetails(id);
    }

    @PostMapping
    public ResponseEntity<ApartmentDetailsResponse> create(
            @Valid @RequestBody ApartmentRequest request, Authentication authentication
    ) {
        ApartmentDetailsResponse response = apartmentService.create(request, authentication.getName());
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}")
                .buildAndExpand(response.apartmentId()).toUri();
        return ResponseEntity.created(location).body(response);
    }

    @PutMapping("/{id}")
    public ApartmentDetailsResponse update(@PathVariable Integer id, @Valid @RequestBody ApartmentRequest request) {
        return apartmentService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ApartmentDetailsResponse deactivate(@PathVariable Integer id) {
        return apartmentService.deactivate(id);
    }

    @PutMapping("/{id}/status")
    public ApartmentDetailsResponse changeStatus(
            @PathVariable Integer id,
            @Valid @RequestBody ApartmentStatusRequest request,
            Authentication authentication
    ) {
        return apartmentService.changeStatus(id, request, authentication.getName());
    }

    @GetMapping("/{id}/status-history")
    public List<ApartmentStatusHistoryResponse> statusHistory(@PathVariable Integer id) {
        return apartmentService.statusHistory(id);
    }

    @PostMapping(value = "/{id}/pictures", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApartmentPictureResponse> addPicture(
            @PathVariable Integer id, @RequestPart("picture") MultipartFile picture
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(apartmentService.addPicture(id, picture));
    }

    @PutMapping("/{id}/pictures/order")
    public List<ApartmentPictureResponse> reorderPictures(
            @PathVariable Integer id, @Valid @RequestBody ApartmentPictureOrderRequest request
    ) {
        return apartmentService.reorderPictures(id, request);
    }

    @DeleteMapping("/{id}/pictures/{pictureId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePicture(@PathVariable Integer id, @PathVariable Long pictureId) {
        apartmentService.deletePicture(id, pictureId);
    }

    @GetMapping("/{id}/unavailability")
    public List<ApartmentUnavailabilityResponse> unavailability(@PathVariable Integer id) {
        return apartmentService.unavailability(id);
    }

    @PostMapping("/{id}/unavailability")
    public ResponseEntity<ApartmentUnavailabilityResponse> addUnavailability(
            @PathVariable Integer id,
            @Valid @RequestBody ApartmentUnavailabilityRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(apartmentService.addUnavailability(id, request, authentication.getName()));
    }

    @PutMapping("/{id}/unavailability/{periodId}")
    public ApartmentUnavailabilityResponse updateUnavailability(
            @PathVariable Integer id,
            @PathVariable Long periodId,
            @Valid @RequestBody ApartmentUnavailabilityRequest request
    ) {
        return apartmentService.updateUnavailability(id, periodId, request);
    }

    @DeleteMapping("/{id}/unavailability/{periodId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUnavailability(@PathVariable Integer id, @PathVariable Long periodId) {
        apartmentService.deleteUnavailability(id, periodId);
    }
}
