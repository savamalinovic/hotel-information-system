package org.unibl.etf.blueStars.controllers;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.unibl.etf.blueStars.models.dto.AppErrorDTO;
import org.unibl.etf.blueStars.services.SettingsService;
import org.unibl.etf.blueStars.configs.OpenApiConfig;

@RestController
@RequestMapping("/api/v1/settings")
@AllArgsConstructor
@Tag(name = "Settings")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class SettingsController {
    private final SettingsService settingsService;

    @PostMapping("/register-error")
    public ResponseEntity<?> registerError(@RequestBody AppErrorDTO dto) {
        AppErrorDTO response = settingsService.registerAppError(dto);
        if(response == null)
            return ResponseEntity.badRequest().body(dto);

        return ResponseEntity.ok(response);
    }
}
