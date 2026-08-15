package org.unibl.etf.efikas.controllers;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.unibl.etf.efikas.configs.OpenApiConfig;
import org.unibl.etf.efikas.models.requests.CreateOperationalExpenseRequest;
import org.unibl.etf.efikas.models.requests.VoidOperationalExpenseRequest;
import org.unibl.etf.efikas.models.responses.OperationalExpenseResponse;
import org.unibl.etf.efikas.models.responses.PageResponse;
import org.unibl.etf.efikas.services.OperationalExpenseService;

import java.net.URI;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/expenses")
@RequiredArgsConstructor
@Tag(name = "Operational expenses")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class OperationalExpenseController {
    private final OperationalExpenseService expenseService;

    @GetMapping
    public PageResponse<OperationalExpenseResponse> list(
            @RequestParam(required = false) LocalDate dateFrom,
            @RequestParam(required = false) LocalDate dateTo,
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(required = false) Integer createdBy,
            @RequestParam(required = false) Boolean voided,
            @PageableDefault(size = 20, sort = {"expenseDate", "operationalExpenseId"},
                    direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return expenseService.expenses(dateFrom, dateTo, categoryId, createdBy, voided, pageable);
    }

    @GetMapping("/{expenseId}")
    public OperationalExpenseResponse get(@PathVariable Long expenseId) {
        return expenseService.expense(expenseId);
    }

    @PostMapping
    public ResponseEntity<OperationalExpenseResponse> create(
            Authentication authentication, @Valid @RequestBody CreateOperationalExpenseRequest request
    ) {
        OperationalExpenseResponse response = expenseService.createExpense(authentication.getName(), request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{expenseId}")
                .buildAndExpand(response.operationalExpenseId()).toUri();
        return ResponseEntity.created(location).body(response);
    }

    @PostMapping("/{expenseId}/void")
    public OperationalExpenseResponse voidExpense(
            Authentication authentication, @PathVariable Long expenseId,
            @Valid @RequestBody VoidOperationalExpenseRequest request
    ) {
        return expenseService.voidExpense(authentication.getName(), expenseId, request.reason());
    }
}
