package org.unibl.etf.blueStars.controllers;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.unibl.etf.blueStars.configs.OpenApiConfig;
import org.unibl.etf.blueStars.models.responses.GuestResponse;
import org.unibl.etf.blueStars.models.responses.PageResponse;
import org.unibl.etf.blueStars.services.GuestService;

@RestController
@RequestMapping("/api/v1/guests")
@RequiredArgsConstructor
@Tag(name = "Guests")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class GuestController {
    private final GuestService guestService;

    @GetMapping
    public PageResponse<GuestResponse> findAll(
            @RequestParam(required = false) String query,
            @PageableDefault(size = 20, sort = {"surname", "name"}) Pageable pageable
    ) {
        return guestService.findAll(query, pageable);
    }

    @GetMapping("/{guestId}")
    public GuestResponse findById(@PathVariable Integer guestId) {
        return guestService.findById(guestId);
    }
}
