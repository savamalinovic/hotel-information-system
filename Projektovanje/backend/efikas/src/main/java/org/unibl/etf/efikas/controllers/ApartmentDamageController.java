package org.unibl.etf.efikas.controllers;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.unibl.etf.efikas.configs.OpenApiConfig;
import org.unibl.etf.efikas.models.requests.CreateDamageRequest;
import org.unibl.etf.efikas.models.requests.UpdateDamageRequest;
import org.unibl.etf.efikas.models.responses.DamageAttachmentResponse;
import org.unibl.etf.efikas.models.responses.DamageResponse;
import org.unibl.etf.efikas.models.responses.PageResponse;
import org.unibl.etf.efikas.services.DamageService;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/apartments/{apartmentId}/damages")
@RequiredArgsConstructor
@Tag(name = "Apartment damages")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class ApartmentDamageController {
    private final DamageService damageService;

    @GetMapping
    public PageResponse<DamageResponse> list(
            Authentication authentication, @PathVariable Integer apartmentId,
            @PageableDefault(size = 20, sort = {"createdAt", "damageId"},
                    direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return damageService.list(authentication.getName(), apartmentId, pageable);
    }

    @GetMapping("/{damageId}")
    public DamageResponse get(
            Authentication authentication, @PathVariable Integer apartmentId, @PathVariable Long damageId
    ) {
        return damageService.get(authentication.getName(), apartmentId, damageId);
    }

    @PostMapping
    public ResponseEntity<DamageResponse> create(
            Authentication authentication, @PathVariable Integer apartmentId,
            @Valid @RequestBody CreateDamageRequest request
    ) {
        DamageResponse response = damageService.create(authentication.getName(), apartmentId, request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{damageId}")
                .buildAndExpand(response.damageId()).toUri();
        return ResponseEntity.created(location).body(response);
    }

    @PutMapping("/{damageId}")
    public DamageResponse update(
            Authentication authentication, @PathVariable Integer apartmentId, @PathVariable Long damageId,
            @Valid @RequestBody UpdateDamageRequest request
    ) {
        return damageService.update(authentication.getName(), apartmentId, damageId, request);
    }

    @GetMapping("/{damageId}/attachments")
    public List<DamageAttachmentResponse> attachments(
            Authentication authentication, @PathVariable Integer apartmentId, @PathVariable Long damageId
    ) {
        return damageService.attachments(authentication.getName(), apartmentId, damageId);
    }

    @PostMapping(value = "/{damageId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DamageAttachmentResponse> attach(
            Authentication authentication, @PathVariable Integer apartmentId, @PathVariable Long damageId,
            @RequestPart MultipartFile file
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(damageService.attach(authentication.getName(), apartmentId, damageId, file));
    }
}
