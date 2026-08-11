package org.unibl.etf.efikas.controllers;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.unibl.etf.efikas.models.dto.ApartmentDTO;
import org.unibl.etf.efikas.models.responses.ApartmentResponse;
import org.unibl.etf.efikas.services.ApartmentService;
import org.unibl.etf.efikas.configs.OpenApiConfig;

import java.io.IOException;
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
    public ResponseEntity<?> getApartments(){
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        List<ApartmentResponse> apartments = apartmentService.getApartmentsForUser(email);

        return ResponseEntity.ok(apartments);
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<?> createApartment(
            @RequestPart("apartment") ApartmentDTO apartmentRequest,
            @RequestPart("pictures") List<MultipartFile> pictures) throws IOException {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName(); // Ako je pogresan email, stavi null


        ApartmentResponse response = apartmentService.createApartmentWithFiles(apartmentRequest, pictures, email);

        return ResponseEntity.ok(response);
    }

    @PutMapping(value = "/{id}", consumes = "multipart/form-data")
    public ResponseEntity<?> updateApartment(
            @PathVariable("id") Integer id,
            @RequestPart("apartment") ApartmentDTO apartmentRequest,
            @RequestPart(value = "pictures", required = false) List<MultipartFile> pictures) throws IOException {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        System.out.println("Hello from update");

        // PUT method behaves in "upsert" manner
        ApartmentResponse response = null;
        try {
            response = apartmentService.updateApartment(id, apartmentRequest, pictures, email);
            return ResponseEntity.ok(response);
        } catch(EntityNotFoundException e) {
            // Create a new apartment with the given ID
            response = apartmentService.createApartmentWithFiles(id, apartmentRequest, pictures, email);

            // Obtain absolute URI to the newly created resource in order to provide a Location header
            URI location = ServletUriComponentsBuilder
                    .fromCurrentRequest()
                    .build()
                    .toUri();
            return ResponseEntity.created(location).body(response);
        }
    }

    @DeleteMapping(value = "/{id}")
    public ResponseEntity<?> deleteApartment(@PathVariable("id") Integer id) throws IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        ApartmentResponse response = apartmentService.deleteApartment(id);
        return ResponseEntity.ok(response);

    }
}
