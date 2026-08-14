package org.unibl.etf.efikas.controllers;

import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.unibl.etf.efikas.models.dto.ChangePasswordDTO;
import org.unibl.etf.efikas.exceptions.DomainConflictException;
import org.unibl.etf.efikas.exceptions.InvalidCredentialsException;
import org.unibl.etf.efikas.models.requests.*;
import org.unibl.etf.efikas.models.responses.AuthenticationResponse;
import org.unibl.etf.efikas.security.JwtUtil;
import org.unibl.etf.efikas.services.AppUserService;
import org.unibl.etf.efikas.services.interfaces.OAuthService;
import org.unibl.etf.efikas.services.interfaces.OtpService;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@AllArgsConstructor
public class AuthController {
    private final AppUserService appUserService;
    private final OtpService otpService;
    private final OAuthService oAuthService;
    private final JwtUtil jwtUtil;

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

    @PostMapping("/google/login")
    public ResponseEntity<?> googleLogin(@Valid @RequestBody OAuthLoginRequest body) {
        String token = body.token();

        try{
            AuthenticationResponse authResponse = oAuthService.authenticateOAuth(token);

            return ResponseEntity.ok()
                    .body(Map.of("accessToken", authResponse.getAccessToken()));
        } catch (GeneralSecurityException | IOException e){
            throw new InvalidCredentialsException();
        }
    }

    @PostMapping("/otp/request")
    public ResponseEntity<?> requestOtp(@Valid @RequestBody OtpSendRequest otpSendRequest) {
        appUserService.getUserByEmail(otpSendRequest.getEmail());

        String response = otpService.sendOtp(otpSendRequest.getEmail());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/otp/verify")
    public ResponseEntity<?> verifyOtp(@Valid @RequestBody OtpVerifyRequest otpVerifyRequest) {
        appUserService.getUserByEmail(otpVerifyRequest.getEmail());

        boolean verified = otpService.verifyOtp(otpVerifyRequest.getEmail(), otpVerifyRequest.getOtp());

        if (!verified) {
            throw new IllegalArgumentException("OTP is invalid or expired.");
        }
        return ResponseEntity.ok("OTP verified");
    }

    @PutMapping("/reset-password")
    public ResponseEntity<?> updatePassword(@Valid @RequestBody ChangePasswordDTO passwordChangeRequest) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        appUserService.changeUserPassword(passwordChangeRequest, authentication);

        return ResponseEntity.ok("Updated password successfully");
    }
}
