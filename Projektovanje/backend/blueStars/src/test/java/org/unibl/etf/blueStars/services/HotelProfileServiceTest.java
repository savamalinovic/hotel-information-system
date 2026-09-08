package org.unibl.etf.blueStars.services;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.unibl.etf.blueStars.models.entities.HotelProfile;
import org.unibl.etf.blueStars.models.requests.UpdateHotelProfileRequest;
import org.unibl.etf.blueStars.repositories.HotelProfileRepository;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HotelProfileServiceTest {
    @Mock
    private HotelProfileRepository hotelProfileRepository;

    @InjectMocks
    private HotelProfileService hotelProfileService;

    @Test
    void updateKeepsSingletonAndNormalizesContactData() {
        HotelProfile profile = new HotelProfile();
        profile.setHotelProfileId(HotelProfile.SINGLETON_ID);
        profile.setName("Old name");
        profile.setUpdatedAt(Instant.EPOCH);
        when(hotelProfileRepository.findById(HotelProfile.SINGLETON_ID)).thenReturn(Optional.of(profile));
        when(hotelProfileRepository.save(any(HotelProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = hotelProfileService.updateProfile(new UpdateHotelProfileRequest(
                " Hotel BlueStars ",
                " BlueStars d.o.o. ",
                " Hotelska 1 ",
                " Banja Luka ",
                "ba",
                "065/123-456",
                " HOTEL@EXAMPLE.COM ",
                " 123456789 "));

        assertThat(profile.getHotelProfileId()).isEqualTo(HotelProfile.SINGLETON_ID);
        assertThat(response.name()).isEqualTo("Hotel BlueStars");
        assertThat(response.countryCode()).isEqualTo("BA");
        assertThat(response.phoneNumber()).isEqualTo("+38765123456");
        assertThat(response.email()).isEqualTo("hotel@example.com");
    }
}
