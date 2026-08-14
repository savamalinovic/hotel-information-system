package org.unibl.etf.efikas.controllers;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.unibl.etf.efikas.models.dto.ApartmentDamageDTO;
import org.unibl.etf.efikas.models.responses.ApartmentDamageResponse;
import org.unibl.etf.efikas.services.ApartmentDamageService;
import org.unibl.etf.efikas.configs.OpenApiConfig;
import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/apartments")
@RequiredArgsConstructor
@Tag(name = "Apartment damages")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class ApartmentDamageController {

    private final ApartmentDamageService apartmentDamageService;

    @GetMapping("{apartmentId}/damages")
    public ResponseEntity<?> getApartmentDamages(@PathVariable Integer apartmentId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        List<ApartmentDamageResponse> damages = apartmentDamageService.getAllApartmentDamagesForApartment(apartmentId, authentication);

        return ResponseEntity.ok(damages);
    }

    @PostMapping("{apartmentId}/damages")
    public ResponseEntity<?> addApartmentDamage(@PathVariable Integer apartmentId, @RequestBody ApartmentDamageDTO damage) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        ApartmentDamageResponse response = apartmentDamageService.createNewApartmentDamage(apartmentId, authentication, damage);

        return ResponseEntity.ok(response);
    }

    @PutMapping("{apartmentId}/damages/{apartmentDamageName}")
    public ResponseEntity<?> updateApartmentDamage(@PathVariable Integer apartmentId, @PathVariable String apartmentDamageName, @RequestBody ApartmentDamageDTO damage) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        // Upsert behavior
        ApartmentDamageResponse response = null;
        try {
            response = apartmentDamageService.updateApartmentDamage(apartmentId, authentication, damage, apartmentDamageName);
            return ResponseEntity.ok(response);
        } catch(EntityNotFoundException e) {
            response = apartmentDamageService.createNewApartmentDamage(apartmentId, authentication, damage);

            // Obtain absolute URI to the newly created resource in order to provide a Location header
            URI location = ServletUriComponentsBuilder
                    .fromCurrentRequest()
                    .build()
                    .toUri();
            return ResponseEntity.created(location).body(response);
        }
    }

    @DeleteMapping("{apartmentId}/damages/{apartmentDamageName}")
    public ResponseEntity<?> deleteApartmentDamage(@PathVariable Integer apartmentId, @PathVariable String apartmentDamageName) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        ApartmentDamageResponse response = apartmentDamageService.deleteApartmentDamage(apartmentId, authentication, apartmentDamageName);

        return ResponseEntity.ok(response);
    }
}
