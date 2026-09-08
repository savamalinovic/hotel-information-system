package org.unibl.etf.blueStars.services;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.blueStars.exceptions.DomainConflictException;
import org.unibl.etf.blueStars.models.entities.ApartmentType;
import org.unibl.etf.blueStars.models.requests.ApartmentTypeRequest;
import org.unibl.etf.blueStars.models.responses.ApartmentTypeResponse;
import org.unibl.etf.blueStars.models.responses.PageResponse;
import org.unibl.etf.blueStars.repositories.ApartmentRepository;
import org.unibl.etf.blueStars.repositories.ApartmentTypeRepository;

@Service
@RequiredArgsConstructor
public class ApartmentTypeService {
    private final ApartmentTypeRepository apartmentTypeRepository;
    private final ApartmentRepository apartmentRepository;

    @Transactional(readOnly = true)
    public PageResponse<ApartmentTypeResponse> findAll(Boolean active, Pageable pageable) {
        Specification<ApartmentType> specification = active == null
                ? null
                : (root, query, builder) -> builder.equal(root.get("active"), active);
        Page<ApartmentTypeResponse> page = apartmentTypeRepository.findAll(specification, pageable)
                .map(ApartmentTypeService::toResponse);
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public ApartmentTypeResponse findById(Integer id) {
        return toResponse(requireType(id));
    }

    @Transactional
    public ApartmentTypeResponse create(ApartmentTypeRequest request) {
        String name = request.name().trim();
        if (apartmentTypeRepository.existsByNameIgnoreCase(name)) {
            throw new DomainConflictException("An apartment type with this name already exists.");
        }
        ApartmentType type = new ApartmentType();
        apply(type, request, name);
        return toResponse(apartmentTypeRepository.saveAndFlush(type));
    }

    @Transactional
    public ApartmentTypeResponse update(Integer id, ApartmentTypeRequest request) {
        ApartmentType type = requireType(id);
        String name = request.name().trim();
        if (apartmentTypeRepository.existsByNameIgnoreCaseAndApartmentTypeIdNot(name, id)) {
            throw new DomainConflictException("An apartment type with this name already exists.");
        }
        apply(type, request, name);
        return toResponse(apartmentTypeRepository.saveAndFlush(type));
    }

    @Transactional
    public ApartmentTypeResponse deactivate(Integer id) {
        ApartmentType type = requireType(id);
        if (apartmentRepository.existsByTypeApartmentTypeIdAndActiveTrue(id)) {
            throw new DomainConflictException("Deactivate apartments of this type before deactivating the type.");
        }
        type.setActive(false);
        return toResponse(apartmentTypeRepository.saveAndFlush(type));
    }

    ApartmentType requireActiveType(Integer id) {
        ApartmentType type = requireType(id);
        if (!type.isActive()) {
            throw new DomainConflictException("The selected apartment type is inactive.");
        }
        return type;
    }

    private ApartmentType requireType(Integer id) {
        return apartmentTypeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Apartment type not found."));
    }

    private static void apply(ApartmentType type, ApartmentTypeRequest request, String normalizedName) {
        type.setName(normalizedName);
        type.setDescription(normalizeNullable(request.description()));
        type.setCapacity(request.capacity());
        type.setDefaultNightlyRate(request.defaultNightlyRate());
    }

    private static String normalizeNullable(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public static ApartmentTypeResponse toResponse(ApartmentType type) {
        return new ApartmentTypeResponse(
                type.getApartmentTypeId(), type.getName(), type.getDescription(), type.getCapacity(),
                type.getDefaultNightlyRate(), type.isActive(), type.getVersion(), type.getCreatedAt(), type.getUpdatedAt());
    }
}
