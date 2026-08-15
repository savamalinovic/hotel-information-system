package org.unibl.etf.efikas.controllers;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.unibl.etf.efikas.configs.OpenApiConfig;
import org.unibl.etf.efikas.models.requests.CreateExpenseCategoryRequest;
import org.unibl.etf.efikas.models.requests.UpdateExpenseCategoryRequest;
import org.unibl.etf.efikas.models.responses.ExpenseCategoryResponse;
import org.unibl.etf.efikas.models.responses.PageResponse;
import org.unibl.etf.efikas.services.OperationalExpenseService;

import java.net.URI;

@RestController
@RequestMapping("/api/v1/expense-categories")
@RequiredArgsConstructor
@Tag(name = "Expense categories")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class ExpenseCategoryController {
    private final OperationalExpenseService expenseService;

    @GetMapping
    public PageResponse<ExpenseCategoryResponse> list(
            @RequestParam(required = false) Boolean active,
            @PageableDefault(size = 100, sort = "name") Pageable pageable
    ) {
        return expenseService.categories(active, pageable);
    }

    @PostMapping
    public ResponseEntity<ExpenseCategoryResponse> create(
            Authentication authentication, @Valid @RequestBody CreateExpenseCategoryRequest request
    ) {
        ExpenseCategoryResponse response = expenseService.createCategory(authentication.getName(), request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{categoryId}")
                .buildAndExpand(response.expenseCategoryId()).toUri();
        return ResponseEntity.created(location).body(response);
    }

    @PutMapping("/{categoryId}")
    public ExpenseCategoryResponse update(
            Authentication authentication, @PathVariable Integer categoryId,
            @Valid @RequestBody UpdateExpenseCategoryRequest request
    ) {
        return expenseService.updateCategory(authentication.getName(), categoryId, request);
    }
}
