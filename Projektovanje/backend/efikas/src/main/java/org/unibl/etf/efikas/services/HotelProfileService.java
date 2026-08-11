package org.unibl.etf.efikas.services;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.efikas.models.entities.HotelProfile;
import org.unibl.etf.efikas.models.requests.UpdateHotelProfileRequest;
import org.unibl.etf.efikas.models.responses.HotelProfileResponse;
import org.unibl.etf.efikas.repositories.HotelProfileRepository;
import org.unibl.etf.efikas.util.PhoneNumbers;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class HotelProfileService {
    private final HotelProfileRepository hotelProfileRepository;

    @Transactional(readOnly = true)
    public HotelProfileResponse getProfile() {
        return toResponse(requireProfile());
    }

    @Transactional
    public HotelProfileResponse updateProfile(UpdateHotelProfileRequest request) {
        HotelProfile profile = requireProfile();
        profile.setName(request.name().trim());
        profile.setLegalName(clean(request.legalName()));
        profile.setAddress(clean(request.address()));
        profile.setCity(clean(request.city()));
        profile.setCountryCode(request.countryCode() == null
                ? null
                : request.countryCode().toUpperCase(Locale.ROOT));
        profile.setPhoneNumber(PhoneNumbers.normalize(request.phoneNumber()));
        profile.setEmail(request.email() == null ? null : request.email().trim().toLowerCase(Locale.ROOT));
        profile.setTaxId(clean(request.taxId()));
        return toResponse(hotelProfileRepository.save(profile));
    }

    private HotelProfile requireProfile() {
        return hotelProfileRepository.findById(HotelProfile.SINGLETON_ID)
                .orElseThrow(() -> new EntityNotFoundException("Hotel profile not found."));
    }

    private static HotelProfileResponse toResponse(HotelProfile profile) {
        return new HotelProfileResponse(
                profile.getName(),
                profile.getLegalName(),
                profile.getAddress(),
                profile.getCity(),
                profile.getCountryCode(),
                profile.getPhoneNumber(),
                profile.getEmail(),
                profile.getTaxId(),
                profile.getUpdatedAt());
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
