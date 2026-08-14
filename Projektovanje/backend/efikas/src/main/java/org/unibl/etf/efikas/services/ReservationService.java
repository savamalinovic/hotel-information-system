package org.unibl.etf.efikas.services;

import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.unibl.etf.efikas.exceptions.S3UploadException;
import org.unibl.etf.efikas.models.dto.DomesticGuestDTO;
import org.unibl.etf.efikas.models.dto.ForeignGuestDTO;
import org.unibl.etf.efikas.models.dto.GuestDTO;
import org.unibl.etf.efikas.models.dto.ReservationDTO;
import org.unibl.etf.efikas.models.dto.books.entries.DomesticGuestsEntry;
import org.unibl.etf.efikas.models.dto.books.entries.ForeignGuestsEntry;
import org.unibl.etf.efikas.models.entities.Apartment;
import org.unibl.etf.efikas.models.entities.GuestsBook;
import org.unibl.etf.efikas.models.entities.Reservation;
import org.unibl.etf.efikas.models.entities.ReservationType;
import org.unibl.etf.efikas.models.requests.UpdateReservationRequest;
import org.unibl.etf.efikas.models.responses.ApartmentResponse;
import org.unibl.etf.efikas.models.responses.FileUploadResponse;
import org.unibl.etf.efikas.models.responses.ReservationResponse;
import org.unibl.etf.efikas.repositories.ApartmentRepository;
import org.unibl.etf.efikas.repositories.GuestsBookRepository;
import org.unibl.etf.efikas.repositories.ReservationRepository;
import org.unibl.etf.efikas.repositories.ReservationTypeRepository;
import org.unibl.etf.efikas.services.interfaces.S3Service;
import org.unibl.etf.efikas.util.Constants;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final ReservationTypeRepository reservationTypeRepository;
    private final ApartmentRepository apartmentRepository;

    private final ApartmentService apartmentService;
    private final ModelMapper modelMapper;
    private final S3Service s3Service;
    private final GuestsBookRepository guestsBookRepository;

    private final DomesticGuestsBookService domesticGuestsBookService;
    private final ForeignGuestsBookService foreignGuestsBookService;

    @Transactional
    public ReservationResponse createNewReservation(Integer apartmentId,
                                                    Authentication authentication,
                                                    ReservationDTO reservationDTO,
                                                    MultipartFile documentPicture
    ) {

        Reservation reservation = persistGuestIfNonExistant(reservationDTO, documentPicture);

        ReservationType reservationType = reservationTypeRepository
                .findReservationTypeByTypeName(reservationDTO.getReservationType())
                .orElseThrow(() -> new EntityNotFoundException("Reservation type not found!"));
        reservation.setType(reservationType);

        Apartment apartment = apartmentRepository.findById(apartmentId)
                .orElseThrow(() -> new EntityNotFoundException("Apartment not found!"));
        reservation.setApartment(apartment);


        Reservation saved = reservationRepository.save(reservation);
        String url = documentPicture != null ? s3Service.getPresignedUrl(saved.getGuest().getPersonalDocumentURL()) : null;
        ReservationResponse response = modelMapper.map(reservation, ReservationResponse.class);
        response.getGuest().setPersonalDocumentURL(url);  // User gets the downloadable URL

        return response;
    }

    public List<ReservationResponse> getAllReservations(Integer apartmentId, Authentication authentication) {
        List<Reservation> reservations = reservationRepository.findReservationByApartmentApartmentId(apartmentId);

        return reservations.stream()
                .map((element) -> modelMapper.map(element, ReservationResponse.class)).collect(Collectors.toList());
    }

    public ReservationResponse getReservation(Integer reservationId, Integer apartmentId, Authentication authentication) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found!"));

        ApartmentResponse apartment = apartmentService.getApartmentById(apartmentId);

        ReservationResponse reservationResponse = modelMapper.map(reservation, ReservationResponse.class);
        reservationResponse.setApartment(apartment);
        reservationResponse.setGuest(getConcreteGuest(reservation.getGuest()));

        return reservationResponse;
    }

    public ReservationResponse updateReservation(Integer reservationId,
                                                 Authentication authentication,
                                                 ReservationDTO updateReservationRequest,
                                                 MultipartFile documentPicture
    ) {

        //Reservation reservation = persistGuestIfNonExistant(updateReservationRequest);
        Reservation reservation = modelMapper.map(updateReservationRequest, Reservation.class);

        Apartment apartment = apartmentRepository.findById(updateReservationRequest.getApartmentId())
                .orElseThrow(() -> new EntityNotFoundException("Apartment not found!"));

        ReservationType reservationType = reservationTypeRepository
                .findReservationTypeByTypeName(updateReservationRequest.getReservationType())
                .orElseThrow(() -> new EntityNotFoundException("Reservation type not found!"));

        reservation.setReservationId(reservationId);
        reservation.setType(reservationType);
        reservation.setNote(updateReservationRequest.getNote());
        reservation.setPrice(updateReservationRequest.getPrice());
        reservation.setApartment(apartment);
        reservation.setGuestQuantity(updateReservationRequest.getGuestQuantity());
        reservation.setGuest(getGuestFromReservationDTO(updateReservationRequest));


        if(documentPicture != null && !documentPicture.isEmpty()) {
            // Delete old picture from S3 bucket
            s3Service.deleteFile(reservation.getGuest().getPersonalDocumentURL());

            FileUploadResponse fileUploadResponse;
            try {
                fileUploadResponse = s3Service.uploadFile(Constants.Aws.S3_BUCKET_IMAGES_FOLDER_PREFIX, documentPicture);
            } catch (IOException e) {
                throw new S3UploadException(e.getMessage());
            }
            String pictureUrl = fileUploadResponse.getFilePath();
            reservation.getGuest().setPersonalDocumentURL(pictureUrl);  // Database gets the key stored
        }


        Reservation saved = saveReservationWithUpdatedGuest(reservation);
        String url = documentPicture != null ? s3Service.getPresignedUrl(saved.getGuest().getPersonalDocumentURL()) : null;
        saved.getGuest().setPersonalDocumentURL(url);  // User gets the downloadable URL
        return modelMapper.map(saved, ReservationResponse.class);
    }

    private GuestsBook getGuestFromReservationDTO(ReservationDTO updateReservationRequest) {
        return modelMapper.map(updateReservationRequest.getGuest(), GuestsBook.class);
    }

    public ReservationResponse deleteReservation(Integer reservationId, Authentication authentication) {
        Reservation reservation = reservationRepository.findReservationByReservationId(reservationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found!"));

        s3Service.deleteFile(reservation.getGuest().getPersonalDocumentURL());
        reservationRepository.delete(reservation);

        return modelMapper.map(reservation, ReservationResponse.class);
    }

    public List<ReservationResponse> getAllReservationsForUser(Authentication authentication) {
        String email = authentication.getName();

        List<Reservation> reservations = reservationRepository.findReservationByApartmentUserEmail(email);

        return reservations.stream()
                .map((element) -> modelMapper.map(element, ReservationResponse.class))
                .collect(Collectors.toList());
    }

    private Reservation persistGuestIfNonExistant(ReservationDTO reservationDTO, MultipartFile documentPicture) {
        String citizenId = reservationDTO.getGuest().getCitizenId();
        GuestsBook guest1 = guestsBookRepository.findByCitizenId(citizenId).orElse(null);
        if(guest1 != null) {
            // Honestly makes no sense, but it works for UNIQUE constraints so we can make multiple reservations
            // per guest... sorry ¯\_(ツ)_/¯
            reservationDTO.getGuest().setId(guest1.getId());
            reservationDTO.getGuest().setPhoneNumber(guest1.getPhoneNumber());
        }


        String pictureUrl = null;
        if (documentPicture != null && !documentPicture.isEmpty()) {
            try {
                FileUploadResponse response = s3Service.uploadFile(Constants.Aws.S3_BUCKET_IMAGES_FOLDER_PREFIX, documentPicture);
                pictureUrl = response.getFilePath();
            } catch (IOException e) {
                throw new S3UploadException(e.getMessage());
            }
        }

        // Lookup by CitizenId (Unique Key)
        String finalPictureUrl = pictureUrl;
        String finalPictureUrl1 = pictureUrl;
        GuestsBook guest = guestsBookRepository.findByCitizenId(citizenId)
                .map(existingGuest -> {
                    modelMapper.typeMap(GuestDTO.class, GuestsBook.class)
                            .addMappings(mapper -> mapper.skip(GuestsBook::setId));
                    // Update existing guest info with new data from DTO
                    modelMapper.map(reservationDTO.getGuest(), existingGuest);

                    
                    // Ensure ID doesn't get overwritten incorrectly if DTO has a null ID
                    if (finalPictureUrl != null) existingGuest.setPersonalDocumentURL(finalPictureUrl);
                    return guestsBookRepository.save(existingGuest);
                })
                .orElseGet(() -> {
                    // Not found? Create brand new
                    GuestsBook newGuest = modelMapper.map(reservationDTO.getGuest(), GuestsBook.class);
                    if (finalPictureUrl1 != null) newGuest.setPersonalDocumentURL(finalPictureUrl1);
                    return guestsBookRepository.save(newGuest);
                });

        System.out.println("IN STREAM API, EXISTING: " + reservationDTO.getGuest().getDateTimeOfArrival());
        System.out.println("IN STREAM API, RESERVATION GUEST: " +  guest.getDateTimeOfArrival());

        Reservation reservation = modelMapper.map(reservationDTO, Reservation.class);
        reservation.setGuest(guest);

        return reservation;
    }

    private Reservation saveReservationWithUpdatedGuest(Reservation reservation) {
        if(reservation.getGuest().getId() == null) {
            throw new IllegalArgumentException("Guest ID can not be null.");
        }

        GuestDTO guestDTO = getConcreteGuest(reservation.getGuest());

        if(guestDTO instanceof DomesticGuestDTO domesticGuestDTO) {
            domesticGuestsBookService.updateDomesticGuest(guestDTO.getId(), domesticGuestDTO);
        }
        else if(guestDTO instanceof ForeignGuestDTO foreignGuestDTO) {
            foreignGuestsBookService.updateForeignGuest(guestDTO.getId(), foreignGuestDTO);
        }

        return reservationRepository.save(reservation);
    }

    public GuestDTO getConcreteGuest(GuestsBook guestsBook) {
        GuestDTO guest = modelMapper.map(guestsBook, guestsBook.getIsLocal() ? DomesticGuestDTO.class : ForeignGuestDTO.class);
        if(guest.getPersonalDocumentURL() != null) {
            String documentUrl = s3Service.getPresignedUrl(guest.getPersonalDocumentURL());
            guest.setPersonalDocumentURL(documentUrl);
        }

        return guest;
    }

}
