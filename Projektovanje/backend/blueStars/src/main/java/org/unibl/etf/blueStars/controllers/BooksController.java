package org.unibl.etf.blueStars.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.unibl.etf.blueStars.configs.OpenApiConfig;
import org.unibl.etf.blueStars.models.responses.GuestBookEntryResponse;
import org.unibl.etf.blueStars.models.responses.IncomeBookEntryResponse;
import org.unibl.etf.blueStars.models.responses.PageResponse;
import org.unibl.etf.blueStars.services.BusinessBooksService;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/books")
@RequiredArgsConstructor
@Tag(name = "Business books")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class BooksController {
    private static final MediaType CSV_MEDIA_TYPE = MediaType.parseMediaType("text/csv;charset=UTF-8");

    private final BusinessBooksService businessBooksService;

    @GetMapping("/domestic-guests")
    @Operation(summary = "Read the immutable domestic guest book")
    public PageResponse<GuestBookEntryResponse> domesticGuests(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String query,
            @PageableDefault(size = 20, sort = "arrivedAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return businessBooksService.domesticGuests(from, to, query, pageable);
    }

    @GetMapping("/foreign-guests")
    @Operation(summary = "Read the immutable foreign guest book")
    public PageResponse<GuestBookEntryResponse> foreignGuests(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String query,
            @PageableDefault(size = 20, sort = "arrivedAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return businessBooksService.foreignGuests(from, to, query, pageable);
    }

    @GetMapping("/income")
    @Operation(summary = "Read the automatic income book")
    public PageResponse<IncomeBookEntryResponse> income(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String query,
            @PageableDefault(size = 20, sort = "accountingDate", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return businessBooksService.income(from, to, query, pageable);
    }

    @GetMapping("/domestic-guests/export")
    @Operation(summary = "Export the filtered domestic guest book as CSV")
    public ResponseEntity<byte[]> exportDomesticGuests(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String query
    ) {
        return csv("domestic-guests.csv", businessBooksService.exportDomesticGuests(from, to, query));
    }

    @GetMapping("/foreign-guests/export")
    @Operation(summary = "Export the filtered foreign guest book as CSV")
    public ResponseEntity<byte[]> exportForeignGuests(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String query
    ) {
        return csv("foreign-guests.csv", businessBooksService.exportForeignGuests(from, to, query));
    }

    @GetMapping("/income/export")
    @Operation(summary = "Export the filtered income book as CSV")
    public ResponseEntity<byte[]> exportIncome(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String query
    ) {
        return csv("income-book.csv", businessBooksService.exportIncome(from, to, query));
    }

    private static ResponseEntity<byte[]> csv(String filename, byte[] body) {
        return ResponseEntity.ok()
                .contentType(CSV_MEDIA_TYPE)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(body);
    }
}
