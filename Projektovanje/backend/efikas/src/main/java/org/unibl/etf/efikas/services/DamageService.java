package org.unibl.etf.efikas.services;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.unibl.etf.efikas.exceptions.DomainConflictException;
import org.unibl.etf.efikas.exceptions.S3UploadException;
import org.unibl.etf.efikas.models.entities.*;
import org.unibl.etf.efikas.models.enums.TaskStatus;
import org.unibl.etf.efikas.models.enums.UserRole;
import org.unibl.etf.efikas.models.requests.CreateDamageRequest;
import org.unibl.etf.efikas.models.requests.UpdateDamageRequest;
import org.unibl.etf.efikas.models.responses.DamageAttachmentResponse;
import org.unibl.etf.efikas.models.responses.DamageResponse;
import org.unibl.etf.efikas.models.responses.PageResponse;
import org.unibl.etf.efikas.repositories.*;
import org.unibl.etf.efikas.services.interfaces.S3Service;
import org.unibl.etf.efikas.services.interfaces.NotificationService;
import org.unibl.etf.efikas.util.Constants;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class DamageService {
    private static final List<TaskStatus> RELEVANT_TASK_STATUSES = List.of(
            TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED);

    private final AppUserRepository appUserRepository;
    private final ApartmentRepository apartmentRepository;
    private final OperationalTaskRepository taskRepository;
    private final DamageRepository damageRepository;
    private final DamageAttachmentRepository attachmentRepository;
    private final S3Service storage;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public PageResponse<DamageResponse> list(String actorEmail, Integer apartmentId, Pageable pageable) {
        requireApartment(apartmentId);
        assertVisible(actor(actorEmail), apartmentId);
        return PageResponse.from(damageRepository.findByApartmentApartmentId(apartmentId, pageable)
                .map(DamageService::toDamage));
    }

    @Transactional(readOnly = true)
    public DamageResponse get(String actorEmail, Integer apartmentId, Long damageId) {
        AppUser actor = actor(actorEmail);
        Damage damage = requireDamage(apartmentId, damageId);
        assertVisible(actor, apartmentId);
        return toDamage(damage);
    }

    @Transactional
    public DamageResponse create(String actorEmail, Integer apartmentId, CreateDamageRequest input) {
        AppUser actor = requireReception(actorEmail);
        Apartment apartment = apartmentRepository.findByIdForUpdate(apartmentId)
                .orElseThrow(() -> new EntityNotFoundException("Apartment not found."));
        if (!apartment.isActive()) {
            throw new DomainConflictException("Damage can only be reported for an active apartment.");
        }
        Instant now = Instant.now();
        Damage damage = new Damage();
        damage.setApartment(apartment);
        apply(damage, input.title(), input.description(), input.estimatedAmount(), input.confirmedAmount());
        damage.setCreatedBy(actor);
        damage.setCreatedAt(now);
        damage.setUpdatedBy(actor);
        damage.setUpdatedAt(now);
        Damage saved = damageRepository.saveAndFlush(damage);
        List<AppUser> managers = appUserRepository.findAllByRoleAndActiveTrue(UserRole.MANAGER).stream()
                .filter(user -> !user.getUserId().equals(actor.getUserId())).toList();
        notificationService.notify(managers, "DAMAGE_REPORTED", "Prijavljena šteta",
                "Prijavljena je šteta u apartmanu " + apartment.getName() + ": " + saved.getTitle());
        return toDamage(saved);
    }

    @Transactional
    public DamageResponse update(
            String managerEmail, Integer apartmentId, Long damageId, UpdateDamageRequest input
    ) {
        AppUser manager = requireManager(managerEmail);
        Damage damage = damageRepository.findByApartmentAndIdForUpdate(apartmentId, damageId)
                .orElseThrow(() -> new EntityNotFoundException("Damage not found."));
        apply(damage, input.title(), input.description(), input.estimatedAmount(), input.confirmedAmount());
        damage.setUpdatedBy(manager);
        damage.setUpdatedAt(after(damage.getUpdatedAt()));
        damageRepository.flush();
        return toDamage(damage);
    }

    @Transactional(readOnly = true)
    public List<DamageAttachmentResponse> attachments(String actorEmail, Integer apartmentId, Long damageId) {
        AppUser actor = actor(actorEmail);
        Damage damage = requireDamage(apartmentId, damageId);
        assertVisible(actor, apartmentId);
        return attachmentRepository.findByDamageDamageIdOrderByUploadedAtAscDamageAttachmentIdAsc(
                damage.getDamageId()).stream().map(this::toAttachment).toList();
    }

    @Transactional
    public DamageAttachmentResponse attach(
            String actorEmail, Integer apartmentId, Long damageId, MultipartFile file
    ) {
        if (file.isEmpty() || file.getSize() > 10_485_760) {
            throw new IllegalArgumentException("Attachment must contain 1 byte to 10 MB.");
        }
        AppUser actor = actor(actorEmail);
        Damage damage = damageRepository.findByApartmentAndIdForUpdate(apartmentId, damageId)
                .orElseThrow(() -> new EntityNotFoundException("Damage not found."));
        assertVisible(actor, apartmentId);
        try {
            var uploaded = storage.uploadFile(Constants.Aws.DAMAGE_ATTACHMENTS_FOLDER_PREFIX, file);
            DamageAttachment attachment = new DamageAttachment();
            attachment.setDamage(damage);
            attachment.setStorageKey(uploaded.getFilePath());
            attachment.setOriginalName(Optional.ofNullable(file.getOriginalFilename()).orElse("attachment"));
            attachment.setContentType(file.getContentType());
            attachment.setSizeBytes(file.getSize());
            attachment.setUploadedBy(actor);
            attachment.setUploadedAt(Instant.now());
            return toAttachment(attachmentRepository.saveAndFlush(attachment));
        } catch (IOException exception) {
            throw new S3UploadException();
        }
    }

    private void assertVisible(AppUser actor, Integer apartmentId) {
        if (actor.getRole() == UserRole.MANAGER || actor.getRole() == UserRole.AGENT) return;
        if (actor.getRole() == UserRole.OPERATIONAL_WORKER
                && taskRepository.existsByAssignedWorkerUserIdAndApartmentApartmentIdAndStatusIn(
                        actor.getUserId(), apartmentId, RELEVANT_TASK_STATUSES)) return;
        throw new AccessDeniedException("Damage is not visible to this worker.");
    }

    private AppUser actor(String email) {
        AppUser actor = appUserRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new EntityNotFoundException("Authenticated user not found."));
        if (!actor.isActive()) {
            throw new DomainConflictException("An active user is required.");
        }
        return actor;
    }

    private AppUser requireReception(String email) {
        AppUser actor = actor(email);
        if (actor.getRole() != UserRole.MANAGER && actor.getRole() != UserRole.AGENT) {
            throw new AccessDeniedException("Only reception staff can report damage.");
        }
        return actor;
    }

    private AppUser requireManager(String email) {
        AppUser actor = actor(email);
        if (actor.getRole() != UserRole.MANAGER) {
            throw new AccessDeniedException("Only a manager can update damage.");
        }
        return actor;
    }

    private Apartment requireApartment(Integer apartmentId) {
        return apartmentRepository.findById(apartmentId)
                .orElseThrow(() -> new EntityNotFoundException("Apartment not found."));
    }

    private Damage requireDamage(Integer apartmentId, Long damageId) {
        return damageRepository.findByDamageIdAndApartmentApartmentId(damageId, apartmentId)
                .orElseThrow(() -> new EntityNotFoundException("Damage not found."));
    }

    private DamageAttachmentResponse toAttachment(DamageAttachment attachment) {
        return new DamageAttachmentResponse(
                attachment.getDamageAttachmentId(), attachment.getOriginalName(), attachment.getContentType(),
                attachment.getSizeBytes(), attachment.getUploadedBy().getUserId(), attachment.getUploadedAt(),
                storage.getPresignedUrl(attachment.getStorageKey()));
    }

    private static DamageResponse toDamage(Damage damage) {
        AppUser author = damage.getCreatedBy();
        return new DamageResponse(
                damage.getDamageId(), damage.getApartment().getApartmentId(), damage.getTitle(),
                damage.getDescription(), damage.getEstimatedAmount(), damage.getConfirmedAmount(),
                author.getUserId(), author.getName(), author.getSurname(), damage.getCreatedAt(),
                damage.getUpdatedBy().getUserId(), damage.getUpdatedAt());
    }

    private static void apply(
            Damage damage, String title, String description,
            java.math.BigDecimal estimatedAmount, java.math.BigDecimal confirmedAmount
    ) {
        damage.setTitle(title.trim());
        damage.setDescription(description.trim());
        damage.setEstimatedAmount(estimatedAmount);
        damage.setConfirmedAmount(confirmedAmount);
    }

    private static Instant after(Instant previous) {
        Instant now = Instant.now();
        return now.isAfter(previous) ? now : previous.plusMillis(1);
    }
}
