package org.unibl.etf.blueStars.models.requests;

import lombok.Builder;
import lombok.Data;
import org.unibl.etf.blueStars.models.dto.DateRangeDTO;
import org.unibl.etf.blueStars.models.dto.books.StoreDTO;
import org.unibl.etf.blueStars.models.dto.books.TaxpayerDTO;

import java.time.LocalDate;

@Data
@Builder
public class FinancialBookPdfRequest {
    private DateRangeDTO period;
    private TaxpayerDTO taxpayer;
    private StoreDTO store;
}
