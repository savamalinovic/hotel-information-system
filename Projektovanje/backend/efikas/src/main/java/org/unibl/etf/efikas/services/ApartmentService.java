package org.unibl.etf.efikas.services;

import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.unibl.etf.efikas.exceptions.DomainConflictException;
import org.unibl.etf.efikas.exceptions.S3UploadException;
import org.unibl.etf.efikas.models.entities.*;
import org.unibl.etf.efikas.models.enums.ApartmentEffectiveStatus;
import org.unibl.etf.efikas.models.enums.ApartmentOperationalStatus;
import org.unibl.etf.efikas.models.enums.ReservationStatus;
import org.unibl.etf.efikas.models.requests.*;
import org.unibl.etf.efikas.models.responses.*;
import org.unibl.etf.efikas.repositories.*;
import org.unibl.etf.efikas.services.interfaces.S3Service;
import org.unibl.etf.efikas.util.Constants;

import java.io.IOException;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ApartmentService {
    private static final long MAX_PICTURE_SIZE_BYTES = 10L * 1024 * 1024;

    private final ApartmentRepository apartmentRepository;
    private final ApartmentTypeService apartmentTypeService;
    private final ApartmentPictureRepository apartmentPictureRepository;
    private final ApartmentUnavailabilityRepository unavailabilityRepository;
    private final ApartmentStatusHistoryRepository statusHistoryRepository;
    private final ReservationRepository reservationRepository;
    private final AppUserRepository appUserRepository;
    private final S3Service s3Service;

    @Transactional(readOnly = true)
    public PageResponse<ApartmentDetailsResponse> findAll(
            Integer apartmentTypeId,
            ApartmentOperationalStatus status,
            Boolean active,
            Boolean outOfOrder,
            Pageable pageable
    ) {
        LocalDate today = LocalDate.now();
        Specification<Apartment> specification = Specification.unrestricted();
        if (apartmentTypeId != null) {
            specification = specification.and((root, query, builder) ->
                    builder.equal(root.get("type").get("apartmentTypeId"), apartmentTypeId));
        }
        if (status != null) {
            specification = specification.and((root, query, builder) ->
                    builder.equal(root.get("operationalStatus"), status));
        }
        if (active != null) {
            specification = specification.and((root, query, builder) -> builder.equal(root.get("active"), active));
        }
        if (outOfOrder != null) {
            specification = specification.and(outOfOrderSpecification(today, outOfOrder));
        }
        Page<ApartmentDetailsResponse> page = apartmentRepository.findAll(specification, pageable)
                .map(apartment -> toDetails(apartment, today));
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public ApartmentDetailsResponse findDetails(Integer id) {
        return toDetails(requireApartment(id), LocalDate.now());
    }

    @Transactional
    public ApartmentDetailsResponse create(ApartmentRequest request, String actorEmail) {
        String name = request.name().trim();
        ensureUniqueName(name, null);
        Apartment apartment = new Apartment();
        apply(apartment, request, name);
        apartment.setOperationalStatus(ApartmentOperationalStatus.READY);
        Apartment saved = apartmentRepository.save(apartment);
        appendStatus(saved, ApartmentOperationalStatus.READY, requireActor(actorEmail), "Apartment created.");
        apartmentRepository.flush();
        return toDetails(saved, LocalDate.now());
    }

    @Transactional
    public ApartmentDetailsResponse update(Integer id, ApartmentRequest request) {
        Apartment apartment = requireApartment(id);
        String name = request.name().trim();
        ensureUniqueName(name, id);
        apply(apartment, request, name);
        return toDetails(apartmentRepository.saveAndFlush(apartment), LocalDate.now());
    }

    @Transactional
    public ApartmentDetailsResponse deactivate(Integer id) {
        Apartment apartment = apartmentRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new EntityNotFoundException("Apartment not found."));
        if (reservationRepository.existsByApartmentApartmentIdAndStatusIn(
                id, List.of(
                        ReservationStatus.CONFIRMED,
                        ReservationStatus.CHECKED_IN))) {
            throw new DomainConflictException("An apartment with a blocking reservation cannot be deactivated.");
        }
        apartment.setActive(false);
        return toDetails(apartmentRepository.saveAndFlush(apartment), LocalDate.now());
    }

    @Transactional
    public ApartmentDetailsResponse changeStatus(Integer id, ApartmentStatusRequest request, String actorEmail) {
        Apartment apartment = apartmentRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new EntityNotFoundException("Apartment not found."));
        if (!apartment.isActive()) {
            throw new DomainConflictException("An inactive apartment cannot change status.");
        }
        if (apartment.getOperationalStatus() != request.status()) {
            apartment.setOperationalStatus(request.status());
            appendStatus(apartment, request.status(), requireActor(actorEmail), request.reason().trim());
            apartmentRepository.flush();
        }
        return toDetails(apartment, LocalDate.now());
    }

    @Transactional(readOnly = true)
    public List<ApartmentStatusHistoryResponse> statusHistory(Integer apartmentId) {
        requireApartment(apartmentId);
        return statusHistoryRepository
                .findByApartmentApartmentIdOrderByChangedAtDescApartmentStatusHistoryIdDesc(apartmentId)
                .stream().map(ApartmentService::toStatusHistory).toList();
    }

    @Transactional
    public ApartmentPictureResponse addPicture(Integer apartmentId, MultipartFile file) {
        Apartment apartment = requireActiveApartment(apartmentId);
        validatePicture(file);
        String storageKey;
        try {
            storageKey = s3Service.uploadFile(Constants.Aws.S3_BUCKET_IMAGES_FOLDER_PREFIX, file).getFilePath();
        } catch (IOException ex) {
            throw new S3UploadException("The apartment picture could not be uploaded.");
        }

        try {
            List<ApartmentPicture> existing = pictures(apartmentId);
            ApartmentPicture picture = new ApartmentPicture();
            picture.setApartment(apartment);
            picture.setStorageKey(storageKey);
            picture.setDisplayOrder(existing.size());
            ApartmentPicture saved = apartmentPictureRepository.saveAndFlush(picture);
            return toPicture(saved);
        } catch (RuntimeException ex) {
            s3Service.deleteFile(storageKey);
            throw ex;
        }
    }

    @Transactional
    public List<ApartmentPictureResponse> reorderPictures(Integer apartmentId, ApartmentPictureOrderRequest request) {
        requireActiveApartment(apartmentId);
        List<ApartmentPicture> pictures = pictures(apartmentId);
        List<Long> ids = request.pictureIds();
        if (ids.size() != pictures.size() || new HashSet<>(ids).size() != ids.size()) {
            throw new DomainConflictException("Picture order must contain every picture exactly once.");
        }
        Map<Long, ApartmentPicture> byId = new HashMap<>();
        pictures.forEach(picture -> byId.put(picture.getPictureId(), picture));
        for (int index = 0; index < ids.size(); index++) {
            ApartmentPicture picture = byId.get(ids.get(index));
            if (picture == null) {
                throw new DomainConflictException("Picture order contains a picture from another apartment.");
            }
            picture.setDisplayOrder(index);
        }
        apartmentPictureRepository.flush();
        return pictures(apartmentId).stream().map(this::toPicture).toList();
    }

    @Transactional
    public void deletePicture(Integer apartmentId, Long pictureId) {
        requireActiveApartment(apartmentId);
        ApartmentPicture picture = apartmentPictureRepository
                .findByPictureIdAndApartmentApartmentId(pictureId, apartmentId)
                .orElseThrow(() -> new EntityNotFoundException("Apartment picture not found."));
        String storageKey = picture.getStorageKey();
        apartmentPictureRepository.delete(picture);
        afterCommit(() -> s3Service.deleteFile(storageKey));
    }

    @Transactional(readOnly = true)
    public List<ApartmentUnavailabilityResponse> unavailability(Integer apartmentId) {
        requireApartment(apartmentId);
        return unavailabilityRepository
                .findByApartmentApartmentIdOrderByStartDateAscApartmentUnavailabilityIdAsc(apartmentId)
                .stream().map(ApartmentService::toUnavailability).toList();
    }

    @Transactional
    public ApartmentUnavailabilityResponse addUnavailability(
            Integer apartmentId, ApartmentUnavailabilityRequest request, String actorEmail
    ) {
        Apartment apartment = lockActiveApartment(apartmentId);
        validatePeriod(request);
        ensureNoOverlap(apartmentId, request, null);
        ApartmentUnavailability period = new ApartmentUnavailability();
        period.setApartment(apartment);
        period.setCreatedBy(requireActor(actorEmail));
        apply(period, request);
        return toUnavailability(unavailabilityRepository.save(period));
    }

    @Transactional
    public ApartmentUnavailabilityResponse updateUnavailability(
            Integer apartmentId, Long periodId, ApartmentUnavailabilityRequest request
    ) {
        lockActiveApartment(apartmentId);
        validatePeriod(request);
        ApartmentUnavailability period = unavailabilityRepository
                .findByApartmentUnavailabilityIdAndApartmentApartmentId(periodId, apartmentId)
                .orElseThrow(() -> new EntityNotFoundException("Apartment unavailability period not found."));
        ensureNoOverlap(apartmentId, request, periodId);
        apply(period, request);
        return toUnavailability(period);
    }

    @Transactional
    public void deleteUnavailability(Integer apartmentId, Long periodId) {
        lockActiveApartment(apartmentId);
        ApartmentUnavailability period = unavailabilityRepository
                .findByApartmentUnavailabilityIdAndApartmentApartmentId(periodId, apartmentId)
                .orElseThrow(() -> new EntityNotFoundException("Apartment unavailability period not found."));
        unavailabilityRepository.delete(period);
    }

    /** Compatibility bridge for the legacy reservation module until B03 replaces its contract. */
    @Transactional(readOnly = true)
    public ApartmentResponse getApartmentById(int id) {
        Apartment apartment = requireApartment(id);
        ApartmentResponse response = new ApartmentResponse();
        response.setApartmentId(apartment.getApartmentId());
        response.setName(apartment.getName());
        response.setAddress(apartment.getAddress());
        response.setCapacity(apartment.getType().getCapacity());
        response.setPricePerNight(apartment.getType().getDefaultNightlyRate().doubleValue());
        response.setTraits(Map.copyOf(apartment.getTraits()));
        response.setPictures(pictures(id).stream().map(p -> s3Service.getPresignedUrl(p.getStorageKey())).toList());
        return response;
    }

    private void apply(Apartment apartment, ApartmentRequest request, String normalizedName) {
        apartment.setName(normalizedName);
        apartment.setAddress(request.address().trim());
        apartment.setFloor(request.floor());
        apartment.setType(apartmentTypeService.requireActiveType(request.apartmentTypeId()));
    }

    private static void apply(ApartmentUnavailability period, ApartmentUnavailabilityRequest request) {
        period.setStartDate(request.startDate());
        period.setEndDate(request.endDate());
        period.setReason(request.reason().trim());
    }

    private void ensureUniqueName(String name, Integer excludedId) {
        boolean exists = excludedId == null
                ? apartmentRepository.existsByNameIgnoreCase(name)
                : apartmentRepository.existsByNameIgnoreCaseAndApartmentIdNot(name, excludedId);
        if (exists) {
            throw new DomainConflictException("An apartment with this name already exists.");
        }
    }

    private void ensureNoOverlap(Integer apartmentId, ApartmentUnavailabilityRequest request, Long excludedId) {
        if (unavailabilityRepository.existsOverlapping(
                apartmentId, request.startDate(), request.endDate(), excludedId)) {
            throw new DomainConflictException("The apartment already has an overlapping unavailability period.");
        }
        if (reservationRepository.existsBlockingDuringUnavailability(
                apartmentId, request.startDate(), request.endDate())) {
            throw new DomainConflictException("The apartment has a blocking reservation during this period.");
        }
    }

    private static void validatePeriod(ApartmentUnavailabilityRequest request) {
        if (request.startDate().isAfter(request.endDate())) {
            throw new IllegalArgumentException("Start date must be on or before end date.");
        }
    }

    private static void validatePicture(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Apartment picture must not be empty.");
        }
        if (file.getSize() > MAX_PICTURE_SIZE_BYTES) {
            throw new IllegalArgumentException("Apartment picture must not exceed 10 MB.");
        }
        if (file.getContentType() == null || !file.getContentType().startsWith("image/")) {
            throw new IllegalArgumentException("Only image files are supported.");
        }
    }

    private Apartment requireApartment(Integer id) {
        return apartmentRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Apartment not found."));
    }

    private Apartment requireActiveApartment(Integer id) {
        Apartment apartment = requireApartment(id);
        if (!apartment.isActive()) {
            throw new DomainConflictException("The apartment is inactive.");
        }
        return apartment;
    }

    private Apartment lockActiveApartment(Integer id) {
        Apartment apartment = apartmentRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new EntityNotFoundException("Apartment not found."));
        if (!apartment.isActive()) {
            throw new DomainConflictException("The apartment is inactive.");
        }
        return apartment;
    }

    private AppUser requireActor(String email) {
        return appUserRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new EntityNotFoundException("Authenticated user not found."));
    }

    private void appendStatus(
            Apartment apartment, ApartmentOperationalStatus status, AppUser actor, String reason
    ) {
        ApartmentStatusHistory history = new ApartmentStatusHistory();
        history.setApartment(apartment);
        history.setStatus(status);
        history.setChangedBy(actor);
        history.setReason(reason);
        statusHistoryRepository.save(history);
    }

    private List<ApartmentPicture> pictures(Integer apartmentId) {
        return apartmentPictureRepository
                .findByApartmentApartmentIdOrderByDisplayOrderAscPictureIdAsc(apartmentId);
    }

    private ApartmentDetailsResponse toDetails(Apartment apartment, LocalDate date) {
        boolean outOfOrder = unavailabilityRepository.existsOnDate(apartment.getApartmentId(), date);
        ApartmentEffectiveStatus effective = outOfOrder
                ? ApartmentEffectiveStatus.OUT_OF_ORDER
                : ApartmentEffectiveStatus.valueOf(apartment.getOperationalStatus().name());
        return new ApartmentDetailsResponse(
                apartment.getApartmentId(), apartment.getName(), apartment.getAddress(), apartment.getFloor(),
                ApartmentTypeService.toResponse(apartment.getType()), apartment.getOperationalStatus(), effective,
                apartment.isActive(), apartment.getVersion(), apartment.getCreatedAt(), apartment.getUpdatedAt(),
                pictures(apartment.getApartmentId()).stream().map(this::toPicture).toList());
    }

    private ApartmentPictureResponse toPicture(ApartmentPicture picture) {
        return new ApartmentPictureResponse(
                picture.getPictureId(), s3Service.getPresignedUrl(picture.getStorageKey()),
                picture.getDisplayOrder(), picture.getCreatedAt());
    }

    private static ApartmentUnavailabilityResponse toUnavailability(ApartmentUnavailability period) {
        return new ApartmentUnavailabilityResponse(
                period.getApartmentUnavailabilityId(), period.getStartDate(), period.getEndDate(), period.getReason(),
                period.getCreatedBy().getUserId(), period.getCreatedAt());
    }

    private static ApartmentStatusHistoryResponse toStatusHistory(ApartmentStatusHistory history) {
        return new ApartmentStatusHistoryResponse(
                history.getApartmentStatusHistoryId(), history.getStatus(), history.getReason(),
                history.getChangedBy() == null ? null : history.getChangedBy().getUserId(), history.getChangedAt());
    }

    private static Specification<Apartment> outOfOrderSpecification(LocalDate date, boolean expected) {
        return (root, query, builder) -> {
            Subquery<Integer> subquery = query.subquery(Integer.class);
            var period = subquery.from(ApartmentUnavailability.class);
            subquery.select(builder.literal(1)).where(
                    builder.equal(period.get("apartment").get("apartmentId"), root.get("apartmentId")),
                    builder.lessThanOrEqualTo(period.get("startDate"), date),
                    builder.greaterThanOrEqualTo(period.get("endDate"), date));
            return expected ? builder.exists(subquery) : builder.not(builder.exists(subquery));
        };
    }

    private static void afterCommit(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            action.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                action.run();
            }
        });
    }
}
