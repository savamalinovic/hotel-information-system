package org.unibl.etf.efikas.services;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.efikas.exceptions.DomainConflictException;
import org.unibl.etf.efikas.models.entities.AppUser;
import org.unibl.etf.efikas.models.entities.Specialization;
import org.unibl.etf.efikas.models.enums.UserRole;
import org.unibl.etf.efikas.models.requests.CreateManagedUserRequest;
import org.unibl.etf.efikas.models.requests.UpdateManagedUserRequest;
import org.unibl.etf.efikas.models.responses.ManagedUserResponse;
import org.unibl.etf.efikas.models.responses.PageResponse;
import org.unibl.etf.efikas.models.responses.SpecializationResponse;
import org.unibl.etf.efikas.repositories.AppUserRepository;
import org.unibl.etf.efikas.repositories.SpecializationRepository;
import org.unibl.etf.efikas.util.PhoneNumbers;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserManagementService {
    private final AppUserRepository appUserRepository;
    private final SpecializationRepository specializationRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public PageResponse<ManagedUserResponse> list(UserRole role, Boolean active, int page, int size) {
        Specification<AppUser> specification = (root, query, builder) -> builder.conjunction();
        if (role != null) {
            specification = specification.and((root, query, builder) -> builder.equal(root.get("role"), role));
        }
        if (active != null) {
            specification = specification.and((root, query, builder) -> builder.equal(root.get("active"), active));
        }

        return PageResponse.from(appUserRepository.findAll(
                specification,
                PageRequest.of(page, size, Sort.by("surname", "name", "userId")))
                .map(UserManagementService::toResponse));
    }

    @Transactional(readOnly = true)
    public ManagedUserResponse get(Integer userId) {
        return toResponse(requireUser(userId));
    }

    @Transactional
    public ManagedUserResponse create(CreateManagedUserRequest request) {
        String email = normalizeEmail(request.email());
        String phoneNumber = PhoneNumbers.normalize(request.phoneNumber());
        ensureUniqueIdentity(null, email, request.jmbg(), phoneNumber);

        AppUser user = new AppUser();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setName(request.name().trim());
        user.setSurname(request.surname().trim());
        user.setJmbg(request.jmbg());
        user.setAddress(request.address().trim());
        user.setPhoneNumber(phoneNumber);
        user.setRole(request.role());
        user.setActive(true);
        user.setSpecializations(resolveSpecializations(request.role(), request.specializationIds()));
        return toResponse(appUserRepository.save(user));
    }

    @Transactional
    public ManagedUserResponse update(Integer userId, UpdateManagedUserRequest request) {
        AppUser user = requireUser(userId);
        if (user.isActive() && user.getRole() == UserRole.MANAGER && request.role() != UserRole.MANAGER) {
            ensureAnotherActiveManager();
        }

        String email = normalizeEmail(request.email());
        String phoneNumber = PhoneNumbers.normalize(request.phoneNumber());
        ensureUniqueIdentity(userId, email, request.jmbg(), phoneNumber);

        user.setEmail(email);
        user.setName(request.name().trim());
        user.setSurname(request.surname().trim());
        user.setJmbg(request.jmbg());
        user.setAddress(request.address().trim());
        user.setPhoneNumber(phoneNumber);
        user.setRole(request.role());
        if (request.role() != UserRole.OPERATIONAL_WORKER) {
            user.getSpecializations().clear();
        }
        return toResponse(appUserRepository.save(user));
    }

    @Transactional
    public ManagedUserResponse setActive(Integer userId, boolean active) {
        AppUser user = requireUser(userId);
        if (!active && user.isActive() && user.getRole() == UserRole.MANAGER) {
            ensureAnotherActiveManager();
        }
        user.setActive(active);
        return toResponse(appUserRepository.save(user));
    }

    @Transactional
    public ManagedUserResponse assignSpecializations(Integer userId, Set<Short> specializationIds) {
        AppUser user = requireUser(userId);
        user.setSpecializations(resolveSpecializations(user.getRole(), specializationIds));
        return toResponse(appUserRepository.save(user));
    }

    private AppUser requireUser(Integer userId) {
        return appUserRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found."));
    }

    private Set<Specialization> resolveSpecializations(UserRole role, Set<Short> specializationIds) {
        Set<Short> requestedIds = specializationIds == null ? Set.of() : specializationIds;
        if (role != UserRole.OPERATIONAL_WORKER && !requestedIds.isEmpty()) {
            throw new IllegalArgumentException("Only operational workers can have specializations.");
        }
        if (requestedIds.isEmpty()) {
            return new HashSet<>();
        }

        List<Specialization> specializations = specializationRepository.findAllById(requestedIds);
        if (specializations.size() != requestedIds.size()) {
            throw new EntityNotFoundException("One or more specializations were not found.");
        }
        return new HashSet<>(specializations);
    }

    private void ensureUniqueIdentity(Integer userId, String email, String jmbg, String phoneNumber) {
        boolean emailExists = userId == null
                ? appUserRepository.existsByEmailIgnoreCase(email)
                : appUserRepository.existsByEmailIgnoreCaseAndUserIdNot(email, userId);
        if (emailExists) {
            throw new DomainConflictException("Email is already in use.");
        }

        boolean jmbgExists = userId == null
                ? appUserRepository.existsByJmbg(jmbg)
                : appUserRepository.existsByJmbgAndUserIdNot(jmbg, userId);
        if (jmbgExists) {
            throw new DomainConflictException("JMBG is already in use.");
        }

        if (phoneNumber != null) {
            boolean phoneExists = userId == null
                    ? appUserRepository.existsByPhoneNumber(phoneNumber)
                    : appUserRepository.existsByPhoneNumberAndUserIdNot(phoneNumber, userId);
            if (phoneExists) {
                throw new DomainConflictException("Phone number is already in use.");
            }
        }
    }

    private void ensureAnotherActiveManager() {
        if (appUserRepository.findActiveByRoleForUpdate(UserRole.MANAGER).size() <= 1) {
            throw new DomainConflictException("The last active manager cannot be deactivated or reassigned.");
        }
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static ManagedUserResponse toResponse(AppUser user) {
        List<SpecializationResponse> specializations = user.getSpecializations().stream()
                .sorted(Comparator.comparing(Specialization::getCode))
                .map(specialization -> new SpecializationResponse(
                        specialization.getSpecializationId(),
                        specialization.getCode(),
                        specialization.getName()))
                .toList();

        return new ManagedUserResponse(
                user.getUserId(),
                user.getEmail(),
                user.getName(),
                user.getSurname(),
                user.getJmbg(),
                user.getAddress(),
                user.getPhoneNumber(),
                user.getRole(),
                user.isActive(),
                specializations,
                user.getCreatedAt(),
                user.getUpdatedAt());
    }
}
