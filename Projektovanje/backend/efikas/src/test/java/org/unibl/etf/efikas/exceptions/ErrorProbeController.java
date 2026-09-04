package org.unibl.etf.efikas.exceptions;

import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.Map;

@RestController
@Profile("error-probe")
class ErrorProbeController {

    @PostMapping("/error-probe/validation")
    ResponseEntity<Void> validation(@Valid @RequestBody ProbeRequest request) {
        return ResponseEntity.ok().build();
    }

    @PostMapping("/error-probe/json")
    ResponseEntity<Void> json(@RequestBody Map<String, Object> request) {
        return ResponseEntity.ok().build();
    }

    @GetMapping("/error-probe/domain-conflict")
    void domainConflict() {
        throw new DomainConflictException("The resource changed before this request was applied.");
    }

    @GetMapping("/error-probe/db-conflict")
    void databaseConflict() {
        throw new DataIntegrityViolationException("duplicate key: secret database detail");
    }

    @GetMapping("/error-probe/not-found")
    void notFound() {
        throw new EntityNotFoundException("Reservation not found.");
    }

    @GetMapping("/error-probe/unexpected")
    void unexpected() {
        throw new IllegalStateException("secret implementation detail");
    }

    @GetMapping("/error-probe/upload-too-large")
    void uploadTooLarge() {
        throw new MaxUploadSizeExceededException(10L * 1024 * 1024);
    }

    record ProbeRequest(
            @NotBlank(message = "Name is required.") String name,
            @NotBlank(message = "Email is required.")
            @Email(message = "Email must be valid.") String email
    ) {
    }
}
