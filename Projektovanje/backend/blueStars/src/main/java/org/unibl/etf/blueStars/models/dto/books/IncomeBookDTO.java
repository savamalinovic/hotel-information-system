package org.unibl.etf.blueStars.models.dto.books;

import lombok.Builder;
import lombok.Data;
import org.unibl.etf.blueStars.models.dto.DateRangeDTO;
import org.unibl.etf.blueStars.models.dto.books.entries.IncomeEntry;
import org.unibl.etf.blueStars.models.requests.BookRequest;

import java.util.List;


@Data
@Builder
public class IncomeBookDTO implements BookRequest {
    private TaxpayerDTO taxpayer;
    private StoreDTO store;
    private DateRangeDTO period;
    @Builder.Default
    private IncomeEntry broughtState = IncomeEntry.builder().build();       // Doneseno stanje
    private List<IncomeEntry> entries;                                      // Svi prihodi poslije
}
