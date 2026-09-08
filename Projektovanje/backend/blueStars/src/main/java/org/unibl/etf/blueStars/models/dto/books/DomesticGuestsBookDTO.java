package org.unibl.etf.blueStars.models.dto.books;

import lombok.Builder;
import lombok.Data;
import org.unibl.etf.blueStars.models.dto.DateRangeDTO;
import org.unibl.etf.blueStars.models.dto.books.entries.DomesticGuestsEntry;
import org.unibl.etf.blueStars.models.dto.books.entries.ForeignGuestsEntry;
import org.unibl.etf.blueStars.models.requests.BookRequest;

import java.util.List;

@Data
@Builder
public class DomesticGuestsBookDTO implements BookRequest {
    private DateRangeDTO period;
    private List<DomesticGuestsEntry> entries;
}
