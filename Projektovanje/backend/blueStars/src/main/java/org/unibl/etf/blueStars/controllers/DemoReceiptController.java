package org.unibl.etf.blueStars.controllers;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.unibl.etf.blueStars.configs.OpenApiConfig;
import org.unibl.etf.blueStars.models.responses.DemoReceiptResponse;
import org.unibl.etf.blueStars.services.DemoReceiptService;

import java.net.URI;

@RestController
@RequestMapping("/api/v1/reservations/{reservationId}/demo-receipt")
@RequiredArgsConstructor
@Tag(name = "Demo receipts")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class DemoReceiptController {
    private final DemoReceiptService demoReceiptService;

    @PostMapping
    public ResponseEntity<DemoReceiptResponse> generate(
            @PathVariable Integer reservationId,
            Authentication authentication
    ) {
        DemoReceiptService.GenerationResult result = demoReceiptService.generate(
                reservationId, authentication.getName());
        if (!result.created()) {
            return ResponseEntity.ok(result.receipt());
        }
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().build().toUri();
        return ResponseEntity.created(location).body(result.receipt());
    }

    @GetMapping
    public DemoReceiptResponse find(@PathVariable Integer reservationId) {
        return demoReceiptService.find(reservationId);
    }

    @GetMapping("/pdf")
    public ResponseEntity<byte[]> pdf(@PathVariable Integer reservationId) {
        DemoReceiptService.PdfDownload download = demoReceiptService.pdf(reservationId);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(download.content().length)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + download.filename() + "\"")
                .body(download.content());
    }
}
