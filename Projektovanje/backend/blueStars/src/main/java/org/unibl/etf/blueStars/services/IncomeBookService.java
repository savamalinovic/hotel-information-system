package org.unibl.etf.blueStars.services;

import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.unibl.etf.blueStars.models.dto.books.IncomeBookDTO;
import org.unibl.etf.blueStars.models.dto.books.entries.IncomeEntry;
import org.unibl.etf.blueStars.models.entities.IncomeBook;
import org.unibl.etf.blueStars.models.requests.CreateIncomeBookRequest;
import org.unibl.etf.blueStars.models.requests.FinancialBookPdfRequest;
import org.unibl.etf.blueStars.repositories.IncomeBookRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class IncomeBookService {
    private final IncomeBookRepository incomeBookRepository;
    private final ApartmentService apartmentService;
    private final ModelMapper modelMapper;


    public List<IncomeEntry> getAll() {
        return incomeBookRepository.findAll().stream()
                .map(ib -> modelMapper.map(ib, IncomeEntry.class))
                .toList();
    }

    /**
     * Persists a new income entry to the database.
     * */
    public IncomeEntry createNewIncome(CreateIncomeBookRequest createIncomeBookRequest) {
        IncomeEntry incomeEntry = createIncomeBookRequest.toIncomeEntry();
        incomeEntry.setApartment(apartmentService.getApartmentById(createIncomeBookRequest.getApartmentId()));

        IncomeBook incomeBook = modelMapper.map(incomeEntry, IncomeBook.class);
        incomeBook.setId(null);
        IncomeBook saved = incomeBookRepository.save(incomeBook);

        return modelMapper.map(saved, IncomeEntry.class);
    }

    /**
     * Generates the income book of requested date range.
     * */
    public IncomeBookDTO getIncomeBookByTime(FinancialBookPdfRequest financialBookPdfRequest) {
        LocalDate from = financialBookPdfRequest.getPeriod().getFrom() != null ? financialBookPdfRequest.getPeriod().getFrom() : firstDateInYear(),
                to = financialBookPdfRequest.getPeriod().getTo();
        List<IncomeEntry> entries = getAll().stream()
                .filter(e -> {
                    LocalDate date = e.getAccountingDate();
                    return (date.isEqual(from) || date.isAfter(from)) &&
                            (date.isEqual(to) || date.isBefore(to));
                })
                .collect(Collectors.toList());

        IncomeEntry broughtState = getBroughtState(from);

        return IncomeBookDTO.builder()
                .taxpayer(financialBookPdfRequest.getTaxpayer())
                .store(financialBookPdfRequest.getStore())
                .period(financialBookPdfRequest.getPeriod())
                .entries(entries)
                .broughtState(broughtState)
                .build();
    }

    /**
     * Calculates the brought/carried over state till the [lower bound]-1 date of the asked date range.
     * */
    public IncomeEntry getBroughtState(LocalDate lowerBoundDate) {
        LocalDate from = firstDateInYear(), to = lowerBoundDate;

        return getAll().stream()
                .filter(e -> {
                    LocalDate date = e.getAccountingDate();
                    return !date.isBefore(from) && date.isBefore(to);
                })
                .reduce((e1, e2) -> IncomeEntry.builder()
                        .apartment(e1.getApartment()) // TODO: Mijenjati apartman u store?
                        .accountingDate(to.minusDays(1)) // TODO: posljednji dan donesenog stanja ili null?
                        .description("Brought forward amount")
                        .productSaleRevenue(e1.getProductSaleRevenue().add(e2.getProductSaleRevenue()))
                        .goodsSaleRevenue(e1.getGoodsSaleRevenue().add(e2.getGoodsSaleRevenue()))
                        .serviceSaleRevenue(e1.getServiceSaleRevenue().add(e2.getServiceSaleRevenue()))
                        .otherRevenue(e1.getOtherRevenue().add(e2.getOtherRevenue()))
                        .financialRevenue(e1.getFinancialRevenue().add(e2.getFinancialRevenue()))
                        .totalRevenue(e1.getTotalRevenue().add(e2.getTotalRevenue()))
                        .vatAmount(e1.getVatAmount().add(e2.getVatAmount()))
                        .build())
                .orElse(null);
    }

    private LocalDate firstDateInYear() {
        return LocalDate.of(LocalDate.now().getYear(), 1, 1);
    }
}
