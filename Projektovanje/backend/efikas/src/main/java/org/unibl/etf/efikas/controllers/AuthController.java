package org.unibl.etf.efikas.controllers;

import io.swagger.v3.oas.annotations.Hidden;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.unibl.etf.efikas.models.dto.ChangePasswordDTO;
import org.unibl.etf.efikas.exceptions.DomainConflictException;
import org.unibl.etf.efikas.exceptions.InvalidCredentialsException;
import org.unibl.etf.efikas.models.requests.*;
import org.unibl.etf.efikas.models.responses.AuthenticationResponse;
import org.unibl.etf.efikas.models.responses.LoginResponse;
import org.unibl.etf.efikas.models.responses.OAuthLoginResponse;
import org.unibl.etf.efikas.models.responses.errors.ApiErrorResponse;
import org.unibl.etf.efikas.models.enums.UserRole;
import org.unibl.etf.efikas.security.JwtUtil;
import org.unibl.etf.efikas.services.AppUserService;
import org.unibl.etf.efikas.services.interfaces.OAuthService;
import org.unibl.etf.efikas.services.interfaces.OtpService;

import java.io.IOException;
import java.security.GeneralSecurityException;

@RestController
@RequestMapping("/api/v1/auth")
@AllArgsConstructor
@Tag(name = "Authentication", description = "Password, Google and OTP authentication entry points.")
public class AuthController {
    private final AppUserService appUserService;
    private final OtpService otpService;
    private final OAuthService oAuthService;
    private final JwtUtil jwtUtil;

    @PostMapping("/register")
    @Hidden
    public ResponseEntity<String> register(@Valid @RequestBody RegistrationRequest user) {
        appUserService.register(user).ifPresent(error -> {
            throw new DomainConflictException(error);
        });
        return ResponseEntity.ok("User registered successfully.");
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate with email and password")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Authenticated",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = LoginResponse.class))),
            @ApiResponse(responseCode = "400", description = "Request validation failed",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Invalid credentials",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Unexpected server error",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest userCredentials) {
        String email = userCredentials.email();
        String password = userCredentials.password();

        boolean isAuthenticated = appUserService.authenticate(email, password);

        if (!isAuthenticated) {
            throw new InvalidCredentialsException();
        }

        // Generate token
        String token = jwtUtil.generateToken(email);
        UserRole role = appUserService.getUserByEmail(email).getRole();

        // Prepare JWT to be returned to the user in JSON form
        return ResponseEntity.ok(new LoginResponse(email, role, token));
    }

    @PostMapping("/google/login")
    @Operation(summary = "Authenticate with a Google identity token")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Authenticated",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = OAuthLoginResponse.class))),
            @ApiResponse(responseCode = "400", description = "Request validation failed",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Google token was rejected",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "Unexpected server error",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<OAuthLoginResponse> googleLogin(@Valid @RequestBody OAuthLoginRequest body) {
        String token = body.token();

        try{
            AuthenticationResponse authResponse = oAuthService.authenticateOAuth(token);

            return ResponseEntity.ok(new OAuthLoginResponse(authResponse.getAccessToken()));
        } catch (GeneralSecurityException | IOException e){
            throw new InvalidCredentialsException();
        }
    }

    @PostMapping("/otp/request")
    @Operation(summary = "Request a password-recovery OTP")
    public ResponseEntity<String> requestOtp(@Valid @RequestBody OtpSendRequest otpSendRequest) {
        appUserService.getUserByEmail(otpSendRequest.getEmail());

        String response = otpService.sendOtp(otpSendRequest.getEmail());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/otp/verify")
    @Operation(summary = "Verify a password-recovery OTP")
    public ResponseEntity<String> verifyOtp(@Valid @RequestBody OtpVerifyRequest otpVerifyRequest) {
        appUserService.getUserByEmail(otpVerifyRequest.getEmail());

        boolean verified = otpService.verifyOtp(otpVerifyRequest.getEmail(), otpVerifyRequest.getOtp());

        if (!verified) {
            throw new IllegalArgumentException("OTP is invalid or expired.");
        }
        return ResponseEntity.ok("OTP verified");
    }

    @PutMapping("/reset-password")
    @Operation(summary = "Reset a password with a verified OTP")
    public ResponseEntity<String> updatePassword(@Valid @RequestBody ChangePasswordDTO passwordChangeRequest) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        appUserService.changeUserPassword(passwordChangeRequest, authentication);

        return ResponseEntity.ok("Updated password successfully");
    }
}
