package org.unibl.etf.efikas.controllers;

import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.unibl.etf.efikas.models.dto.UserDTO;
import org.unibl.etf.efikas.models.dto.books.StoreDTO;
import org.unibl.etf.efikas.exceptions.DomainConflictException;
import org.unibl.etf.efikas.exceptions.InvalidCredentialsException;
import org.unibl.etf.efikas.models.requests.CreateStoreRequest;
import org.unibl.etf.efikas.models.requests.LoginRequest;
import org.unibl.etf.efikas.models.requests.RegistrationRequest;
import org.unibl.etf.efikas.models.responses.AppUserResponse;
import org.unibl.etf.efikas.security.JwtUtil;
import org.unibl.etf.efikas.services.AppUserService;
import org.unibl.etf.efikas.services.StoreService;

import java.net.URI;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
@AllArgsConstructor
public class AppUserController {

    private final AppUserService appUserService;
    private final StoreService storeService;
    private final JwtUtil jwtUtil;


    // This is temporary, for compatibility with old code till migration can be done to AuthController
    @PostMapping("/register")
    public ResponseEntity<String> register(@Valid @RequestBody RegistrationRequest user) {
        appUserService.register(user).ifPresent(error -> {
            throw new DomainConflictException(error);
        });
        return ResponseEntity.ok("User registered successfully.");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest userCredentials) {
        String email = userCredentials.email();
        String password = userCredentials.password();

        boolean isAuthenticated = appUserService.authenticate(email, password);

        if (!isAuthenticated) {
            throw new InvalidCredentialsException();
        }

        // Generate token
        String token = jwtUtil.generateToken(email);
        String role = appUserService.getUserByEmail(email).getRole().name();

        // Prepare JWT to be returned to the user in JSON form
        return ResponseEntity.ok(Map.of(
                "email", email,
                "role", role,
                "token", token
        ));
    }


    @PostMapping("/register/store")
    public ResponseEntity<?> registerStore(@RequestBody CreateStoreRequest createStoreRequest) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        StoreDTO saved = storeService.createStore(createStoreRequest, authentication);

        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest().path("/store/{id}")
                .buildAndExpand(saved).toUri();

        return ResponseEntity.created(location).body(saved);
    }


    @GetMapping("/me")
    public ResponseEntity<?> getAccountInfo() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        AppUserResponse response = appUserService.getCurrentUserInfo(authentication);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/me/store")
    public ResponseEntity<?> getAccountStoreInfo() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        StoreDTO response = storeService.getStoreForActiveUser(authentication);

        return ResponseEntity.ok(response);
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateAccountInfo(@RequestBody UserDTO user) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        AppUserResponse response = appUserService.updateUserAccount(user, authentication);
        String email = response.getEmail();
        // Generate token (there might have been a change in email)
        String token = jwtUtil.generateToken(email);

        // Prepare JWT to be returned to the user in JSON form
        return ResponseEntity.ok(Map.of(
                "email", email,
                "role", response.getRole().name(),
                "token", token
        ));
    }


    @DeleteMapping("/me")
    public ResponseEntity<?> deleteAccount() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        AppUserResponse response = appUserService.deleteUserAccount(authentication);

        return ResponseEntity.ok(response);
    }

}
