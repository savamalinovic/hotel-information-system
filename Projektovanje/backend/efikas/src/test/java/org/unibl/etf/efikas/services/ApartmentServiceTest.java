package org.unibl.etf.efikas.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.mock.web.MockMultipartFile;
import org.unibl.etf.efikas.models.entities.Apartment;
import org.unibl.etf.efikas.models.responses.FileUploadResponse;
import org.unibl.etf.efikas.repositories.*;
import org.unibl.etf.efikas.services.interfaces.S3Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ApartmentServiceTest {
    @Mock ApartmentRepository apartmentRepository;
    @Mock ApartmentTypeService apartmentTypeService;
    @Mock ApartmentPictureRepository apartmentPictureRepository;
    @Mock ApartmentUnavailabilityRepository unavailabilityRepository;
    @Mock ApartmentStatusHistoryRepository statusHistoryRepository;
    @Mock AppUserRepository appUserRepository;
    @Mock S3Service s3Service;

    @InjectMocks ApartmentService apartmentService;

    @Test
    void rejectsNonImageBeforeCallingStorage() {
        Apartment apartment = activeApartment();
        when(apartmentRepository.findById(12)).thenReturn(Optional.of(apartment));
        var file = new MockMultipartFile("picture", "notes.txt", "text/plain", "not an image".getBytes());

        assertThatThrownBy(() -> apartmentService.addPicture(12, file))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("image");
        verifyNoInteractions(s3Service);
    }

    @Test
    void removesUploadedObjectWhenDatabaseWriteFails() throws Exception {
        Apartment apartment = activeApartment();
        when(apartmentRepository.findById(12)).thenReturn(Optional.of(apartment));
        when(apartmentPictureRepository.findByApartmentApartmentIdOrderByDisplayOrderAscPictureIdAsc(12))
                .thenReturn(List.of());
        when(s3Service.uploadFile(anyString(), any()))
                .thenReturn(new FileUploadResponse("images/apartment.png", LocalDateTime.now()));
        when(apartmentPictureRepository.saveAndFlush(any()))
                .thenThrow(new DataIntegrityViolationException("test conflict"));
        var file = new MockMultipartFile("picture", "apartment.png", "image/png", new byte[]{1, 2, 3});

        assertThatThrownBy(() -> apartmentService.addPicture(12, file))
                .isInstanceOf(DataIntegrityViolationException.class);
        verify(s3Service).deleteFile("images/apartment.png");
    }

    private static Apartment activeApartment() {
        Apartment apartment = new Apartment();
        apartment.setApartmentId(12);
        apartment.setActive(true);
        return apartment;
    }
}
