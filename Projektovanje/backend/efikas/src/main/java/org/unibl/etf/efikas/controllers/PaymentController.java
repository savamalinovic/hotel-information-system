package org.unibl.etf.efikas.controllers;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.unibl.etf.efikas.configs.OpenApiConfig;
import org.unibl.etf.efikas.models.requests.CorrectPaymentRequest;
import org.unibl.etf.efikas.models.requests.RecordPaymentRequest;
import org.unibl.etf.efikas.models.requests.ReversePaymentRequest;
import org.unibl.etf.efikas.models.responses.PaymentResponse;
import org.unibl.etf.efikas.models.responses.PaymentSummaryResponse;
import org.unibl.etf.efikas.services.PaymentService;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/reservations/{reservationId}/payments")
@RequiredArgsConstructor
@Tag(name = "Payments")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class PaymentController {
    private final PaymentService paymentService;

    @GetMapping
    public List<PaymentResponse> findAll(@PathVariable Integer reservationId) {
        return paymentService.findAll(reservationId);
    }

    @GetMapping("/summary")
    public PaymentSummaryResponse summary(@PathVariable Integer reservationId) {
        return paymentService.summary(reservationId);
    }

    @PostMapping
    public ResponseEntity<PaymentResponse> record(
            @PathVariable Integer reservationId,
            @Valid @RequestBody RecordPaymentRequest request,
            Authentication authentication
    ) {
        PaymentResponse response = paymentService.record(reservationId, request, authentication.getName());
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{paymentId}")
                .buildAndExpand(response.paymentId()).toUri();
        return ResponseEntity.created(location).body(response);
    }

    @PostMapping("/{paymentId}/corrections")
    public ResponseEntity<PaymentResponse> correct(
            @PathVariable Integer reservationId,
            @PathVariable Long paymentId,
            @Valid @RequestBody CorrectPaymentRequest request,
            Authentication authentication
    ) {
        PaymentResponse response = paymentService.correct(
                reservationId, paymentId, request, authentication.getName());
        URI location = ServletUriComponentsBuilder.fromCurrentRequestUri().replacePath(
                        "/api/v1/reservations/{reservationId}/payments/{newPaymentId}")
                .buildAndExpand(reservationId, response.paymentId()).toUri();
        return ResponseEntity.created(location).body(response);
    }

    @PostMapping("/{paymentId}/reversal")
    public ResponseEntity<PaymentResponse> reverse(
            @PathVariable Integer reservationId,
            @PathVariable Long paymentId,
            @Valid @RequestBody ReversePaymentRequest request,
            Authentication authentication
    ) {
        PaymentResponse response = paymentService.reverse(
                reservationId, paymentId, request, authentication.getName());
        URI location = ServletUriComponentsBuilder.fromCurrentRequestUri().replacePath(
                        "/api/v1/reservations/{reservationId}/payments/{newPaymentId}")
                .buildAndExpand(reservationId, response.paymentId()).toUri();
        return ResponseEntity.created(location).body(response);
    }
}
