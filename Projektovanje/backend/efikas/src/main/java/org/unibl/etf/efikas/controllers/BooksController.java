package org.unibl.etf.efikas.controllers;

import io.swagger.v3.oas.annotations.Hidden;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.unibl.etf.efikas.exceptions.BookPdfGenerationException;
import org.unibl.etf.efikas.design_patterns.factory.BookPdfFactory;
import org.unibl.etf.efikas.exceptions.InvalidBookPeriodException;
import org.unibl.etf.efikas.models.dto.DateRangeDTO;
import org.unibl.etf.efikas.models.dto.DomesticGuestDTO;
import org.unibl.etf.efikas.models.dto.ForeignGuestDTO;
import org.unibl.etf.efikas.models.dto.books.*;
import org.unibl.etf.efikas.models.dto.books.entries.DomesticGuestsEntry;
import org.unibl.etf.efikas.models.dto.books.entries.ForeignGuestsEntry;
import org.unibl.etf.efikas.models.dto.books.entries.IncomeEntry;
import org.unibl.etf.efikas.models.enums.BookType;
import org.unibl.etf.efikas.models.requests.*;
import org.unibl.etf.efikas.models.responses.AppUserResponse;
import org.unibl.etf.efikas.services.*;
import org.unibl.etf.efikas.services.impl.books.BaseBookPdfService;
import org.unibl.etf.efikas.configs.OpenApiConfig;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/books")
@AllArgsConstructor
@Tag(name = "Business books")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class BooksController {
    private final BookPdfFactory bookPdfFactory;
    private final AppUserService appUserService;
    private final StoreService storeService;
    private final IncomeBookService incomeBookService;
    private final ForeignGuestsBookService foreignGuestsBookService;
    private final DomesticGuestsBookService domesticGuestsBookService;


    // =========================================== PDF endpoints ===========================================

    @GetMapping("/pdf/INCOME")
    public ResponseEntity<StreamingResponseBody> downloadIncomeBookPdf(
            @RequestParam Integer taxpayerId,
            @RequestParam(required = false) Integer storeId,
            @RequestParam LocalDate from,
            @RequestParam LocalDate to
    ) throws IOException {
        System.out.println("IN book CONTROLLER");
        AppUserResponse appUserResponse = appUserService.getUserById(taxpayerId);
        if(from.isAfter(to)) {
            throw new InvalidBookPeriodException("From date can not come after To date range");
        }

        TaxpayerDTO taxpayer = getTaxpayerDTO(appUserResponse);
        StoreDTO store = getStoreDTO();
        FinancialBookPdfRequest financialBookPdfRequest = FinancialBookPdfRequest.builder()
                .taxpayer(taxpayer)
                .store(store)
                .period(DateRangeDTO.builder()
                        .from(from)
                        .to(to)
                        .build()
                )
                .build();

        var pdfService = bookPdfFactory.get(BookType.INCOME);
        IncomeBookDTO request = incomeBookService.getIncomeBookByTime(financialBookPdfRequest);

        return getStreamingResponseBodyResponseEntity(pdfService, request, BookType.INCOME);
    }

    @GetMapping("/pdf/FOREIGN_GUESTS")
    public ResponseEntity<StreamingResponseBody> downloadForeignGuestsBookPdf(
            @RequestParam(required = false) Boolean active,
            @RequestParam LocalDate from,
            @RequestParam LocalDate to
    ) throws IOException {
        if(from.isAfter(to)) {
            throw new InvalidBookPeriodException("From date can not come after To date range");
        }

        var pdfService = bookPdfFactory.get(BookType.FOREIGN_GUESTS);
        ForeignGuestsBookDTO request = foreignGuestsBookService.findForPdf(from, to, active);

        return getStreamingResponseBodyResponseEntity(pdfService, request, BookType.FOREIGN_GUESTS);
    }

    @GetMapping("/pdf/DOMESTIC_GUESTS")
    public ResponseEntity<StreamingResponseBody> downloadDomesticGuestsBookPdf(
            @RequestParam(required = false) Boolean active,
            @RequestParam LocalDate from,
            @RequestParam LocalDate to
    ) throws IOException {  //@RequestBody GuestsBookRequest guestsBookRequest
        if(from.isAfter(to)) {
            throw new InvalidBookPeriodException("From date can not come after To date range");
        }

        var pdfService = bookPdfFactory.get(BookType.DOMESTIC_GUESTS);
        DomesticGuestsBookDTO request = domesticGuestsBookService.findForPdf(from, to, active);

        return getStreamingResponseBodyResponseEntity(pdfService, request, BookType.DOMESTIC_GUESTS);
    }


    // =========================================== POST endpoints ===========================================

    @PostMapping("/income")
    @Hidden
    public ResponseEntity<?> addIncomeEntry(@Validated @RequestBody CreateIncomeBookRequest createIncomeBookRequest) {
        IncomeEntry saved = incomeBookService.createNewIncome(createIncomeBookRequest);

        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest().path("/{id}")
                .buildAndExpand(saved.getId()).toUri();

        return ResponseEntity.created(location).body(saved);
    }

    @PostMapping("/expenses")
    @Hidden
    public ResponseEntity<?> addExpensesEntry(@RequestBody IncomeEntry incomeEntry) {


        return ResponseEntity.created(URI.create("test")).build();
    }

    @PostMapping("/domestic-guests")
    @Hidden
    public ResponseEntity<?> addDomesticGuestsEntry(@Validated @RequestBody DomesticGuestDTO createDomesticGuestRequest) {
        DomesticGuestsEntry saved = domesticGuestsBookService.createNewDomesticGuest(createDomesticGuestRequest);

        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest().path("/{id}")
                .buildAndExpand(saved).toUri();

        return ResponseEntity.created(location).body(saved);
    }

    @PostMapping("/foreign-guests")
    @Hidden
    public ResponseEntity<?> addForeignGuestsEntry(@Validated @RequestBody ForeignGuestDTO createForeignGuestRequest) {
        ForeignGuestsEntry saved = foreignGuestsBookService.createNewForeignGuest(createForeignGuestRequest);

        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest().path("/{id}")
                .buildAndExpand(saved.getId()).toUri();

        return ResponseEntity.created(location).body(saved);
    }

    // =========================================== PUT endpoints ===========================================
    @PutMapping("/domestic-guests/{id}")
    @Hidden
    public ResponseEntity<?> addDomesticGuestsEntry(@PathVariable int id, @Validated @RequestBody DomesticGuestDTO createDomesticGuestRequest) {
        DomesticGuestsEntry saved = domesticGuestsBookService.updateDomesticGuest(id, createDomesticGuestRequest);

        return ResponseEntity.ok(saved);
    }

    @PutMapping("/foreign-guests/{id}")
    @Hidden
    public ResponseEntity<?> addForeignGuestsEntry(@PathVariable int id, @Validated @RequestBody ForeignGuestDTO createForeignGuestRequest) {
        ForeignGuestsEntry saved = foreignGuestsBookService.updateForeignGuest(id, createForeignGuestRequest);

        return ResponseEntity.ok(saved);
    }


    // =========================================== GET endpoints ===========================================


    // =========================================== Private helpers ===========================================
    private TaxpayerDTO getTaxpayerDTO(AppUserResponse appUserResponse) {
        return TaxpayerDTO.builder()
                .fullName(appUserResponse.getName() + " " +  appUserResponse.getSurname())
                .jmbg(appUserResponse.getJmbg())
                .address(appUserResponse.getAddress())
                .build();
    }

    private StoreDTO getStoreDTO() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        System.out.println("IN getStoreDTO CONTROLLER");
        System.out.println("AUTH: " + authentication);
        return storeService.getStoreForActiveUser(authentication);
    }

    private ResponseEntity<StreamingResponseBody> getStreamingResponseBodyResponseEntity(
            BaseBookPdfService<BookRequest> pdfService,
            BookRequest request,
            BookType type
    ) {
        try (InputStream pdfStream = pdfService.generatePdf(request)) {  // try-with-resources without resource leaks
            StreamingResponseBody responseBody = outputStream -> {
                try {
                    pdfStream.transferTo(outputStream);
                } catch (IOException e) {
                    throw new BookPdfGenerationException("Failed to stream PDF content");
                }
            };

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + type + "_" + System.currentTimeMillis() + ".pdf\"")
                    .body(responseBody);
        } catch (IOException e) {
            throw new BookPdfGenerationException("Failed to generate PDF");
        }
    }
}
