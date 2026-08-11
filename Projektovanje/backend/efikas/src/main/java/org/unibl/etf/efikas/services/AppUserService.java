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
import org.unibl.etf.efikas.util.PhoneNumbers;

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
        return appUserRepository.findByEmailIgnoreCase(email).orElseThrow(() -> new EntityNotFoundException("User not found"));
    }

    public Optional<String> register(RegistrationRequest user) {

        if (appUserRepository.existsByEmailIgnoreCase(user.getEmail())) {
            return Optional.of("Email already exists.");
        }
        String phoneNumber = user.getPhoneNumber();

        AppUser newUser = modelMapper.map(user, AppUser.class);
        newUser.setRole(UserRole.AGENT);
        newUser.setPhoneNumber(PhoneNumbers.normalize(phoneNumber));
        // hashing the password
        newUser.setPasswordHash(passwordEncoder.encode(user.getPassword()));

        appUserRepository.save(newUser);
        return Optional.empty(); // no error
    }

    public boolean authenticate(String email, String password) {
        return appUserRepository.findByEmailIgnoreCase(email)
                .filter(AppUser::isActive)
                .map(user -> passwordEncoder.matches(password, user.getPasswordHash()))
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
        AppUser user = appUserRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found!"));

        return modelMapper.map(user, AppUserResponse.class);
    }


    public AppUserResponse updateUserAccount(UserDTO userDto, Authentication authentication) {
        String email = authentication.getName();

        AppUser user = appUserRepository.findByEmailIgnoreCase(email)
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
        AppUser user = appUserRepository.findByEmailIgnoreCase(email)
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
        AppUser user = appUserRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found!"));

        appUserRepository.delete(user);
        return modelMapper.map(user, AppUserResponse.class);
    }

}
