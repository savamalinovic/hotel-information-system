package org.unibl.etf.efikas.controllers;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.websocket.server.PathParam;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.unibl.etf.efikas.models.dto.ApartmentDTO;
import org.unibl.etf.efikas.models.dto.DomesticGuestDTO;
import org.unibl.etf.efikas.models.dto.ReservationDTO;
import org.unibl.etf.efikas.models.requests.UpdateReservationRequest;
import org.unibl.etf.efikas.models.responses.ReservationResponse;
import org.unibl.etf.efikas.services.ReservationService;
import org.unibl.etf.efikas.configs.OpenApiConfig;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Reservations")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class ReservationController {

    private final ReservationService reservationService;
    private final ObjectMapper objectMapper;

    @PostMapping(value = "/apartments/{apartmentId}/reservations", consumes = "multipart/form-data")//
    public ResponseEntity<?> createReservation(
            @PathVariable Integer apartmentId,
            //@RequestPart("reservation") ReservationDTO reservationDTO,
            @RequestPart("reservation") String createReservationJson,
            @RequestPart(name = "picture", required = false) MultipartFile documentPicture
    ) throws JsonProcessingException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        System.out.println("Email: " + email);

        ReservationDTO dto = objectMapper.readValue(createReservationJson, ReservationDTO.class);
        System.out.println("RESERVATION DTO: " + dto);

        // For POST, we are extracting apartmentId from the endpoint URL itself.
        // We are not relying on the value found in DTO.
        ReservationResponse response = reservationService.createNewReservation(apartmentId, authentication,
                dto, documentPicture);

        return ResponseEntity.ok(response); //response
    }

    @GetMapping(value = "/apartments/{apartmentId}/reservations")
    public ResponseEntity<?> getReservations(@PathVariable Integer apartmentId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        List<ReservationResponse> response = reservationService.getAllReservations(apartmentId, authentication);

        return ResponseEntity.ok(response);
    }

    @GetMapping(value = "/reservations/{reservationId}")
    public ResponseEntity<?> getReservation(@PathVariable Integer reservationId, @RequestParam Integer apartmentId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        ReservationResponse response = reservationService.getReservation(reservationId, apartmentId, authentication);

        return ResponseEntity.ok(response);
    }

    @PutMapping(value = "/reservations/{reservationId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateReservation(@PathVariable Integer reservationId,
                                               //@RequestPart("reservation") ReservationDTO updateReservationRequest,
                                               @RequestPart("reservation") String updateReservationJson,
                                               @RequestPart(name = "picture", required = false) MultipartFile documentPicture) throws JsonProcessingException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();


        ReservationDTO dto = objectMapper.readValue(updateReservationJson, ReservationDTO.class);

        ReservationResponse response = reservationService
                .updateReservation(reservationId, authentication, dto, documentPicture);

        // TODO: implement upsert behavior

        return ResponseEntity.ok(response);
    }

    @DeleteMapping(value = "/reservations/{reservationId}")
    public ResponseEntity<?> deleteReservation(@PathVariable Integer reservationId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        ReservationResponse response = reservationService.deleteReservation(reservationId, authentication);

        return ResponseEntity.ok(response);
    }

    @GetMapping(value = "/reservations")
    public ResponseEntity<?> getAllUserReservations() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        List<ReservationResponse> response = reservationService.getAllReservationsForUser(authentication);

        return ResponseEntity.ok(response);
    }

}
