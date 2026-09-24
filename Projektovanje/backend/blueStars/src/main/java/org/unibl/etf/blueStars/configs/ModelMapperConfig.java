package org.unibl.etf.blueStars.configs;

import org.modelmapper.ModelMapper;
import org.modelmapper.convention.MatchingStrategies;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.unibl.etf.blueStars.models.dto.ApartmentExpenseDTO;
import org.unibl.etf.blueStars.models.dto.GuestDTO;
import org.unibl.etf.blueStars.models.dto.ReservationDTO;
import org.unibl.etf.blueStars.models.entities.*;
import org.unibl.etf.blueStars.models.responses.ApartmentDamageResponse;
import org.unibl.etf.blueStars.models.responses.ApartmentExpenseResponse;
import org.unibl.etf.blueStars.models.responses.ApartmentTaskResponse;
import org.unibl.etf.blueStars.models.responses.ReservationResponse;

@Configuration
public class ModelMapperConfig {

    @Bean
    public ModelMapper modelMapper() {
        ModelMapper mapper = new ModelMapper();

        mapper.getConfiguration().setAmbiguityIgnored(true)
                .setMatchingStrategy(MatchingStrategies.STRICT);
        // Provide custom mapping for ApartmentExpenseResponse
        mapper.createTypeMap(ApartmentExpense.class, ApartmentExpenseResponse.class)
                .addMapping(
                        source -> source.getId().getName(),
                        ApartmentExpenseResponse::setName
                )
                .addMapping(
                        source -> source.getId().getApartmentId(),
                        ApartmentExpenseResponse::setApartmentId
                )
                .addMapping(
                        source -> source.getExpenseType().getName(),
                        ApartmentExpenseResponse::setExpenseType
                );;

        // Provide custom mapping for ApartmentDamageResponse
        mapper.createTypeMap(ApartmentDamage.class, ApartmentDamageResponse.class)
                .addMapping(
                        source -> source.getId().getName(),
                        ApartmentDamageResponse::setName
                )
                .addMapping(
                        source -> source.getId().getApartmentId(),
                        ApartmentDamageResponse::setApartmentId
                );

        // Provide custom mapping for ApartmentTaskResponse
        mapper.createTypeMap(ApartmentTask.class, ApartmentTaskResponse.class)
                .addMapping(
                        source -> source.getId().getName(),
                        ApartmentTaskResponse::setName
                )
                .addMapping(
                        source -> source.getId().getApartmentId(),
                        ApartmentTaskResponse::setApartmentId
                );

        mapper.createTypeMap(Reservation.class, ReservationResponse.class)
                .addMapping(source -> source.getType().getTypeName(), ReservationResponse::setReservationType);

        // We skip the reservationId when creating a Reservation from ReservationDTO
        mapper.createTypeMap(ReservationDTO.class, Reservation.class)
                .addMappings(m -> m.skip(Reservation::setReservationId));

        // Skip the expenseType when creating an ApartmentExpense from ApartmentExpenseDTO
        mapper.createTypeMap(ApartmentExpenseDTO.class, ApartmentExpense.class)
                .addMappings(m -> m.skip(ApartmentExpense::setExpenseType));

        mapper.typeMap(GuestDTO.class, GuestsBook.class)
                .addMappings(m -> m.skip(GuestsBook::setId));

        return mapper;
    }
}
