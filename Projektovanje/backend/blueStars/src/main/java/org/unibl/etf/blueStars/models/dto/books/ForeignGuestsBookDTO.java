package org.unibl.etf.blueStars.models.dto.books;

import lombok.Builder;
import lombok.Data;
import org.unibl.etf.blueStars.models.dto.DateRangeDTO;
import org.unibl.etf.blueStars.models.dto.books.entries.ForeignGuestsEntry;
import org.unibl.etf.blueStars.models.requests.BookRequest;

import java.util.List;

@Data
@Builder
public class ForeignGuestsBookDTO implements BookRequest {
    private DateRangeDTO period;
    private List<ForeignGuestsEntry> entries;
}
