package org.unibl.etf.efikas.controllers;

import io.swagger.v3.oas.annotations.Hidden;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.unibl.etf.efikas.models.dto.ApartmentExpenseDTO;
import org.unibl.etf.efikas.models.entities.ApartmentExpense;
import org.unibl.etf.efikas.models.responses.ApartmentExpenseResponse;
import org.unibl.etf.efikas.models.responses.ApartmentResponse;
import org.unibl.etf.efikas.services.ApartmentExpenseService;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/apartments/")
@RequiredArgsConstructor
@Hidden
public class ApartmentExpenseController {

    private final ApartmentExpenseService apartmentExpenseService;

    @GetMapping("{apartmentId}/expenses")
    public ResponseEntity<?> getApartmentExpenses(@PathVariable Integer apartmentId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        List<ApartmentExpenseResponse> expenses =
                apartmentExpenseService.getAllApartmentExpensesForApartment(apartmentId, authentication);

        return ResponseEntity.ok(expenses);
    }

    @PostMapping("{apartmentId}/expenses")
    public ResponseEntity<?> addApartmentExpense(@PathVariable Integer apartmentId, @RequestBody ApartmentExpenseDTO expense) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        ApartmentExpenseResponse response = apartmentExpenseService.createNewApartmentExpense(apartmentId, authentication, expense);

        return ResponseEntity.ok(response);
    }

    @PutMapping("{apartmentId}/expenses/{apartmentExpenseName}")
    public ResponseEntity<?> updateApartmentExpense(@PathVariable String apartmentId, @PathVariable String apartmentExpenseName, @RequestBody ApartmentExpenseDTO expense) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        System.out.println("APARTMENT ID: " + apartmentId);

        // Upsert behavior
        ApartmentExpenseResponse response = null;
        try {
            response = apartmentExpenseService.updateApartmentExpense(Integer.valueOf(apartmentId) , authentication, expense, apartmentExpenseName);
            return ResponseEntity.ok(response);
        } catch(EntityNotFoundException e) {
            response = apartmentExpenseService.createNewApartmentExpense(Integer.valueOf(apartmentId), authentication, expense);

            // Obtain absolute URI to the newly created resource in order to provide a Location header
            URI location = ServletUriComponentsBuilder
                    .fromCurrentRequest()
                    .build()
                    .toUri();
            return ResponseEntity.created(location).body(response);
        }
    }

    @DeleteMapping("{apartmentId}/expenses/{apartmentExpenseName}")
    public ResponseEntity<?> deleteApartmentExpense(@PathVariable Integer apartmentId, @PathVariable String apartmentExpenseName) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        ApartmentExpenseResponse response = apartmentExpenseService.deleteApartmentExpense(apartmentId, authentication, apartmentExpenseName);

        return ResponseEntity.ok(response);
    }
}
