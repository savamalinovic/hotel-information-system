package org.unibl.etf.blueStars.controllers;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.unibl.etf.blueStars.models.entities.ApartmentTraitId;
import org.unibl.etf.blueStars.models.enums.ApartmentTrait;
import org.unibl.etf.blueStars.models.responses.ApartmentTraitResponse;
import org.unibl.etf.blueStars.configs.OpenApiConfig;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/v1/apartment-traits")
@RequiredArgsConstructor
@Tag(name = "Apartment traits")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class ApartmentTraitController {

    private final ModelMapper modelMapper;

    @GetMapping
    public List<ApartmentTraitResponse> getApartmentTraits(){
        return Stream.of(ApartmentTrait.values())
                .map(e -> modelMapper.map(e, ApartmentTraitResponse.class)).collect(Collectors.toList());
    }
}
