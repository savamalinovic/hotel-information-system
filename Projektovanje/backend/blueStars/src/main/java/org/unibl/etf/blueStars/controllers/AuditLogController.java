package org.unibl.etf.blueStars.controllers;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.unibl.etf.blueStars.configs.OpenApiConfig;
import org.unibl.etf.blueStars.models.enums.AuditEvent;
import org.unibl.etf.blueStars.models.responses.AuditLogResponse;
import org.unibl.etf.blueStars.models.responses.PageResponse;
import org.unibl.etf.blueStars.services.AuditLogService;

import java.time.Instant;

@RestController
@RequestMapping("/api/v1/audit-logs")
@RequiredArgsConstructor
@Tag(name = "Audit")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class AuditLogController {
    private final AuditLogService auditLogService;

    @GetMapping
    public PageResponse<AuditLogResponse> list(
            Authentication authentication,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(required = false) Integer actorId,
            @RequestParam(required = false) AuditEvent event,
            @RequestParam(required = false) Integer reservationId,
            @RequestParam(required = false) Integer apartmentId,
            @RequestParam(required = false) Long taskId,
            @PageableDefault(size = 20, sort = {"occurredAt", "auditLogId"}, direction = Sort.Direction.DESC)
            Pageable pageable
    ) {
        return auditLogService.find(authentication.getName(), from, to, actorId, event,
                reservationId, apartmentId, taskId, pageable);
    }
}
