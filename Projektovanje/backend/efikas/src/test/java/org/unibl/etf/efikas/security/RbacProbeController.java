package org.unibl.etf.efikas.security;

import org.springframework.http.ResponseEntity;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Profile("rbac-probe")
class RbacProbeController {

    @PostMapping("/api/v1/auth/login")
    ResponseEntity<Void> login() {
        return ResponseEntity.ok().build();
    }

    @PostMapping("/api/v1/auth/register")
    ResponseEntity<Void> register() {
        return ResponseEntity.ok().build();
    }

    @GetMapping("/api/v1/apartments")
    ResponseEntity<Void> apartments() {
        return ResponseEntity.ok().build();
    }

    @PostMapping("/api/v1/apartments")
    ResponseEntity<Void> createApartment() {
        return ResponseEntity.ok().build();
    }

    @GetMapping("/api/v1/books/report")
    ResponseEntity<Void> books() {
        return ResponseEntity.ok().build();
    }

    @PostMapping("/api/v1/books/income")
    ResponseEntity<Void> createBookEntry() {
        return ResponseEntity.ok().build();
    }

    @GetMapping("/api/v1/reservations/1")
    ResponseEntity<Void> reservation() {
        return ResponseEntity.ok().build();
    }

    @GetMapping("/api/v1/apartments/1/reservations")
    ResponseEntity<Void> apartmentReservations() {
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/api/v1/reservations/1/status")
    ResponseEntity<Void> changeReservationStatus() {
        return ResponseEntity.ok().build();
    }

    @GetMapping("/api/v1/apartments/1/tasks")
    ResponseEntity<Void> tasks() {
        return ResponseEntity.ok().build();
    }

    @PostMapping("/api/v1/apartments/1/tasks")
    ResponseEntity<Void> createTask() {
        return ResponseEntity.ok().build();
    }

    @GetMapping("/api/v1/cash-registers")
    ResponseEntity<Void> cashRegisters() {
        return ResponseEntity.ok().build();
    }

    @GetMapping("/api/v1/not-in-matrix")
    ResponseEntity<Void> unknown() {
        return ResponseEntity.ok().build();
    }

    @GetMapping("/api/v1/users/me")
    ResponseEntity<Void> profile() {
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/api/v1/users/me")
    ResponseEntity<Void> deleteProfile() {
        return ResponseEntity.ok().build();
    }

    @GetMapping("/api/v1/users")
    ResponseEntity<Void> users() {
        return ResponseEntity.ok().build();
    }

    @PostMapping("/api/v1/users")
    ResponseEntity<Void> createUser() {
        return ResponseEntity.ok().build();
    }

    @GetMapping("/api/v1/hotel-profile")
    ResponseEntity<Void> hotelProfile() {
        return ResponseEntity.ok().build();
    }

    @PutMapping("/api/v1/hotel-profile")
    ResponseEntity<Void> updateHotelProfile() {
        return ResponseEntity.ok().build();
    }

    @GetMapping("/api/v1/specializations")
    ResponseEntity<Void> specializations() {
        return ResponseEntity.ok().build();
    }
}
