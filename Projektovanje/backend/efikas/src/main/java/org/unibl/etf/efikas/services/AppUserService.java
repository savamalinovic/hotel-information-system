package org.unibl.etf.efikas.services;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.unibl.etf.efikas.models.dto.ChangePasswordDTO;
import org.unibl.etf.efikas.models.dto.UserDTO;
import org.unibl.etf.efikas.models.dto.books.StoreDTO;
import org.unibl.etf.efikas.models.entities.AppUser;
import org.unibl.etf.efikas.models.entities.Store;
import org.unibl.etf.efikas.models.enums.UserRole;
import org.unibl.etf.efikas.models.requests.RegistrationRequest;
import org.unibl.etf.efikas.repositories.AppUserRepository;
import org.unibl.etf.efikas.models.responses.AppUserResponse;
import org.unibl.etf.efikas.services.interfaces.OtpService;

import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AppUserService {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final OtpService otpService;
    private final ModelMapper modelMapper;

    public AppUserResponse getUserById(int userId) {
        AppUser appUser = appUserRepository.findById(userId).orElseThrow(() -> new EntityNotFoundException("User not found"));

        return modelMapper.map(appUser, AppUserResponse.class);
    }

    public AppUser getUserByEmail(String email) {
        return appUserRepository.findByEmail(email).orElseThrow(() -> new EntityNotFoundException("User not found"));
    }

    public Optional<String> register(RegistrationRequest user) {

        if (appUserRepository.existsByEmail(user.getEmail())) {
            return Optional.of("Email already exists.");
        }
        String phoneNumber = user.getPhoneNumber();

        AppUser newUser = modelMapper.map(user, AppUser.class);
        newUser.setRole(UserRole.AGENT);
        newUser.setPhoneNumber(normalizePhoneNumber(phoneNumber));
        // hashing the password
        newUser.setPasswordHash(passwordEncoder.encode(user.getPassword()));

        appUserRepository.save(newUser);
        return Optional.empty(); // no error
    }

    public boolean authenticate(String email, String password) {
        return appUserRepository.findByEmail(email).map(user -> passwordEncoder.matches(password, user.getPasswordHash()))
                .orElse(false);
    }

    public String getCurrentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("User is not logged in.");
        }

        return authentication.getName();
    }

    public AppUserResponse getCurrentUserInfo(Authentication authentication) {
        String email = authentication.getName();
        AppUser user = appUserRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found!"));

        return modelMapper.map(user, AppUserResponse.class);
    }


    public AppUserResponse updateUserAccount(UserDTO userDto, Authentication authentication) {
        String email = authentication.getName();

        AppUser user = appUserRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found!"));

        user.setName(userDto.getName());
        user.setSurname(userDto.getSurname());
        user.setJmbg(userDto.getJmbg());
        user.setEmail(userDto.getEmail());
        user.setAddress(userDto.getAddress());

        return modelMapper.map(appUserRepository.save(user), AppUserResponse.class);
    }

    public void changeUserPassword(ChangePasswordDTO changePasswordDTO, Authentication authentication) {
        String email = changePasswordDTO.getEmail();
        AppUser user = appUserRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found!"));

        if(!changePasswordDTO.getNewPassword().equals(changePasswordDTO.getConfirmPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Passwords do not match!");
        }

        boolean validOtp = otpService.verifyOtp(email, changePasswordDTO.getOtp());
        if(!validOtp) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid OTP!");
        }

        otpService.deleteOtpFromStorage(email); // Delete immediately after success
        user.setPasswordHash(passwordEncoder.encode(changePasswordDTO.getNewPassword()));
        appUserRepository.save(user);
    }

    public AppUserResponse deleteUserAccount(Authentication authentication) {
        String email = authentication.getName();
        AppUser user = appUserRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found!"));

        appUserRepository.delete(user);
        return modelMapper.map(user, AppUserResponse.class);
    }

    // Translates the phone number to E.164 format (+38765...)
    private String normalizePhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            return null;
        }

        // 1. Remove all non-numeric characters (slashes, hyphens, spaces)
        String digitsOnly = phoneNumber.replaceAll("[^0-9]", "");

        // 2. Handle the Bosnian local prefix
        // If it starts with '0', replace that first '0' with '+387'
        if (digitsOnly.startsWith("0")) {
            return "+387" + digitsOnly.substring(1);
        }

        // 3. If it already starts with '387', just add the '+'
        if (digitsOnly.startsWith("387")) {
            return "+" + digitsOnly;
        }

        // 4. If it's already +387, return as is
        if (phoneNumber.startsWith("+387")) {
            return "+" + digitsOnly;
        }

        return null;
    }

}
