package org.unibl.etf.efikas.controllers;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.unibl.etf.efikas.configs.OpenApiConfig;
import org.unibl.etf.efikas.models.requests.ApartmentTypeRequest;
import org.unibl.etf.efikas.models.responses.ApartmentTypeResponse;
import org.unibl.etf.efikas.models.responses.PageResponse;
import org.unibl.etf.efikas.services.ApartmentTypeService;

import java.net.URI;

@RestController
@RequestMapping("/api/v1/apartment-types")
@RequiredArgsConstructor
@Tag(name = "Apartment types")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class ApartmentTypeController {
    private final ApartmentTypeService apartmentTypeService;

    @GetMapping
    public PageResponse<ApartmentTypeResponse> findAll(
            @RequestParam(required = false) Boolean active,
            @PageableDefault(size = 20, sort = "name") Pageable pageable
    ) {
        return apartmentTypeService.findAll(active, pageable);
    }

    @GetMapping("/{id}")
    public ApartmentTypeResponse findById(@PathVariable Integer id) {
        return apartmentTypeService.findById(id);
    }

    @PostMapping
    public ResponseEntity<ApartmentTypeResponse> create(@Valid @RequestBody ApartmentTypeRequest request) {
        ApartmentTypeResponse response = apartmentTypeService.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}")
                .buildAndExpand(response.apartmentTypeId()).toUri();
        return ResponseEntity.created(location).body(response);
    }

    @PutMapping("/{id}")
    public ApartmentTypeResponse update(@PathVariable Integer id, @Valid @RequestBody ApartmentTypeRequest request) {
        return apartmentTypeService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ApartmentTypeResponse deactivate(@PathVariable Integer id) {
        return apartmentTypeService.deactivate(id);
    }
}
