package org.unibl.etf.blueStars.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.blueStars.models.responses.SpecializationResponse;
import org.unibl.etf.blueStars.repositories.SpecializationRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SpecializationService {
    private final SpecializationRepository specializationRepository;

    @Transactional(readOnly = true)
    public List<SpecializationResponse> list() {
        return specializationRepository.findAllByOrderByCodeAsc().stream()
                .map(specialization -> new SpecializationResponse(
                        specialization.getSpecializationId(),
                        specialization.getCode(),
                        specialization.getName()))
                .toList();
    }
}
