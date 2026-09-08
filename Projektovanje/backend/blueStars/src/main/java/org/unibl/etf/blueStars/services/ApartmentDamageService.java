package org.unibl.etf.blueStars.services;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.unibl.etf.blueStars.models.dto.ApartmentDamageDTO;
import org.unibl.etf.blueStars.models.entities.*;
import org.unibl.etf.blueStars.repositories.ApartmentDamageRepository;
import org.unibl.etf.blueStars.models.responses.ApartmentDamageResponse;
import org.unibl.etf.blueStars.repositories.ApartmentRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ApartmentDamageService {

    private final ApartmentDamageRepository apartmentDamageRepository;
    private final ApartmentRepository apartmentRepository;
    private final ModelMapper modelMapper;

    // Obtain all apartment damages for a given apartment
    public List<ApartmentDamageResponse> getAllApartmentDamagesForApartment(Integer apartmentId, Authentication authentication) {
        return apartmentDamageRepository.findApartmentDamageByApartmentApartmentId(apartmentId)
                .stream().map((element) -> modelMapper.map(element, ApartmentDamageResponse.class))
                .collect(Collectors.toList());
    }

    // Create new damage for a given apartment
    public ApartmentDamageResponse createNewApartmentDamage(Integer apartmentId, Authentication authentication, ApartmentDamageDTO damage) {
        ApartmentDamage apartmentDamage = modelMapper.map(damage, ApartmentDamage.class);

        Apartment apartment = apartmentRepository.findById(apartmentId)
                .orElseThrow(() -> new EntityNotFoundException("Apartment not found!"));

        apartmentDamage.setApartment(apartment);
        ApartmentDamageId id = new ApartmentDamageId();
        id.setApartmentId(apartmentId);
        id.setName(damage.getName());

        apartmentDamage.setId(id);

        apartmentDamageRepository.save(apartmentDamage);

        return modelMapper.map(apartmentDamage, ApartmentDamageResponse.class);
    }

    public ApartmentDamageResponse updateApartmentDamage(Integer apartmentId, Authentication authentication, ApartmentDamageDTO damage, String apartmentDamageName) {
        ApartmentDamageId apartmentDamageId = new ApartmentDamageId();
        apartmentDamageId.setApartmentId(apartmentId);
        apartmentDamageId.setName(apartmentDamageName);

        // If I haven't mentioned it before, I really overcomplicated things with this unnecessary composite primary key.
        ApartmentDamage apartmentDamage = apartmentDamageRepository.findApartmentDamageById(apartmentDamageId)
                .orElseThrow(() -> new EntityNotFoundException("Apartment damage not found!"));

        apartmentRepository.findById(apartmentId)
                .orElseThrow(() -> new EntityNotFoundException("Apartment not found!"));

        apartmentDamageRepository.delete(apartmentDamage);

        modelMapper.map(damage, apartmentDamage);

        String newName = damage.getName();
        if(newName != null && !newName.equals(apartmentDamage.getId().getName())) {
            ApartmentDamageId newId = new ApartmentDamageId();
            newId.setApartmentId(apartmentId);
            newId.setName(newName);

            apartmentDamage.setId(newId);
        }

        apartmentDamageRepository.save(apartmentDamage);

        return modelMapper.map(apartmentDamage, ApartmentDamageResponse.class);
    }

    public ApartmentDamageResponse deleteApartmentDamage(Integer apartmentId, Authentication authentication, String apartmentDamageName) {
        ApartmentDamageId apartmentDamageId = new ApartmentDamageId();
        apartmentDamageId.setApartmentId(apartmentId);
        apartmentDamageId.setName(apartmentDamageName);

        ApartmentDamage apartmentDamage = apartmentDamageRepository.findApartmentDamageById(apartmentDamageId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Apartment damage not found!"));

        apartmentDamageRepository.delete(apartmentDamage);

        return modelMapper.map(apartmentDamage, ApartmentDamageResponse.class);
    }

}
