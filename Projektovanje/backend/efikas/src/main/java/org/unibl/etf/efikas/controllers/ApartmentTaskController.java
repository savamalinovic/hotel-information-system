package org.unibl.etf.efikas.controllers;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.unibl.etf.efikas.models.dto.ApartmentExpenseDTO;
import org.unibl.etf.efikas.models.dto.ApartmentTaskDTO;
import org.unibl.etf.efikas.models.entities.ApartmentTask;
import org.unibl.etf.efikas.models.responses.ApartmentExpenseResponse;
import org.unibl.etf.efikas.models.responses.ApartmentTaskResponse;
import org.unibl.etf.efikas.services.ApartmentTaskService;
import org.unibl.etf.efikas.configs.OpenApiConfig;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/apartments")
@RequiredArgsConstructor
@Tag(name = "Apartment tasks")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
@Hidden
public class ApartmentTaskController {

    private final ApartmentTaskService apartmentTaskService;

    @GetMapping("{apartmentId}/tasks")
    public ResponseEntity<?> getApartmentTasks(@PathVariable Integer apartmentId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        List<ApartmentTaskResponse> tasks =
                apartmentTaskService.getAllApartmentTasksForApartment(apartmentId, authentication);

        return ResponseEntity.ok(tasks);
    }

    @PostMapping("{apartmentId}/tasks")
    public ResponseEntity<?> addApartmentTasks(@PathVariable Integer apartmentId, @RequestBody ApartmentTaskDTO task) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        ApartmentTaskResponse response = apartmentTaskService.createNewApartmentTask(apartmentId, authentication, task);

        return ResponseEntity.ok(response);
    }

    @PutMapping("{apartmentId}/tasks/{apartmentTaskName}")
    public ResponseEntity<?> updateApartmentTask(@PathVariable Integer apartmentId, @PathVariable String apartmentTaskName, @RequestBody ApartmentTaskDTO task) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        // Upsert behavior
        ApartmentTaskResponse response = null;
        try {
            response = apartmentTaskService.updateApartmentTask(apartmentId, authentication, task, apartmentTaskName);
            return ResponseEntity.ok(response);
        } catch(EntityNotFoundException e) {
            response = apartmentTaskService.createNewApartmentTask(apartmentId, authentication, task);

            // Obtain absolute URI to the newly created resource in order to provide a Location header
            URI location = ServletUriComponentsBuilder
                    .fromCurrentRequest()
                    .build()
                    .toUri();
            return ResponseEntity.created(location).body(response);
        }
    }

    @DeleteMapping("{apartmentId}/tasks/{apartmentTaskName}")
    public ResponseEntity<?> deleteApartmentTask(@PathVariable Integer apartmentId, @PathVariable String apartmentTaskName) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        ApartmentTaskResponse response = apartmentTaskService.deleteApartmentTask(apartmentId, authentication, apartmentTaskName);

        return ResponseEntity.ok(response);
    }
}
