package org.unibl.etf.efikas.controllers;

import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.unibl.etf.efikas.models.dto.ChangePasswordDTO;
import org.unibl.etf.efikas.models.entities.AppUser;
import org.unibl.etf.efikas.models.requests.OtpSendRequest;
import org.unibl.etf.efikas.models.requests.OtpVerifyRequest;
import org.unibl.etf.efikas.models.requests.RegistrationRequest;
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
    public ResponseEntity<?> register(@RequestBody RegistrationRequest user) {
        return appUserService.register(user)
                .map(error -> ResponseEntity.badRequest().body(error))
                .orElseGet(() -> ResponseEntity.ok("User registered successfully."));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> userCredentials) {
        String email = userCredentials.get("email");
        String password = userCredentials.get("password");

        boolean isAuthenticated = appUserService.authenticate(email, password);

        if (!isAuthenticated) {
            return ResponseEntity.status(HttpServletResponse.SC_UNAUTHORIZED)
                    .body(Map.of("error", "Invalid credentials"));
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
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> body) {
        String token = body.get("token");

        try{
            AuthenticationResponse authResponse = oAuthService.authenticateOAuth(token);

            return ResponseEntity.ok()
                    .body(Map.of("accessToken", authResponse.getAccessToken()));
        } catch (GeneralSecurityException | IOException e){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    @PostMapping("/otp/request")
    public ResponseEntity<?> requestOtp(@RequestBody OtpSendRequest otpSendRequest) {
        AppUser appUser = appUserService.getUserByEmail(otpSendRequest.getEmail());
        if(appUser == null) {
            return ResponseEntity.notFound().build();
        }

        String response = otpService.sendOtp(otpSendRequest.getEmail());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/otp/verify")
    public ResponseEntity<?> verifyOtp(@RequestBody OtpVerifyRequest otpVerifyRequest) {
        AppUser appUser = appUserService.getUserByEmail(otpVerifyRequest.getEmail());
        if(appUser == null) {
            return ResponseEntity.notFound().build();
        }

        boolean verified = otpService.verifyOtp(otpVerifyRequest.getEmail(), otpVerifyRequest.getOtp());

        return verified ? ResponseEntity.ok("OTP verified") : ResponseEntity.status(HttpStatus.NOT_FOUND).body("OTP not valid");
    }

    @PutMapping("/reset-password")
    public ResponseEntity<?> updatePassword(@RequestBody ChangePasswordDTO passwordChangeRequest) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        appUserService.changeUserPassword(passwordChangeRequest, authentication);

        return ResponseEntity.ok("Updated password successfully");
    }
}
