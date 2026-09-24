package org.unibl.etf.blueStars.services;

import lombok.AllArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.unibl.etf.blueStars.exceptions.NoRelevantGuestsException;
import org.unibl.etf.blueStars.models.dto.DateRangeDTO;
import org.unibl.etf.blueStars.models.dto.ForeignGuestDTO;
import org.unibl.etf.blueStars.models.dto.books.ForeignGuestsBookDTO;
import org.unibl.etf.blueStars.models.dto.books.entries.ForeignGuestsEntry;
import org.unibl.etf.blueStars.models.entities.AppUser;
import org.unibl.etf.blueStars.models.entities.GuestsBook;
import org.unibl.etf.blueStars.repositories.GuestsBookRepository;
import org.unibl.etf.blueStars.repositories.specifications.GuestsPdfSpecifications;

import java.time.LocalDate;
import java.util.List;

@Service
@AllArgsConstructor
public class ForeignGuestsBookService {
    private final GuestsBookRepository foreignGuestsBookRepository;
    private final AppUserService appUserService;
    private final ModelMapper modelMapper;


    public List<ForeignGuestDTO> getAll() {
        return foreignGuestsBookRepository.findAll().stream()
                .map(ib -> modelMapper.map(ib, ForeignGuestDTO.class))
                .toList();
    }

    /**
     * Persists a new foreign guest entry to the database.
     * */
    public ForeignGuestsEntry createNewForeignGuest(ForeignGuestDTO createForeignGuestRequest) {
        GuestsBook foreignGuestsBook = modelMapper.map(createForeignGuestRequest, GuestsBook.class);
        foreignGuestsBook.setId(null);
        GuestsBook saved = foreignGuestsBookRepository.save(foreignGuestsBook);

        return modelMapper.map(saved, ForeignGuestsEntry.class);
    }

    /**
     * Updates a foreign guest
     * */
    public ForeignGuestsEntry updateForeignGuest(int guestId, ForeignGuestDTO updateForeignGuestRequest) {
        updateForeignGuestRequest.setId(guestId);
        GuestsBook foreignGuest = modelMapper.map(updateForeignGuestRequest, GuestsBook.class);
        GuestsBook saved = foreignGuestsBookRepository.save(foreignGuest);

        return modelMapper.map(saved, ForeignGuestsEntry.class);
    }


    public ForeignGuestsBookDTO findForPdf(
            LocalDate fromDate,
            LocalDate toDate,
            Boolean active
    ) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        AppUser user = appUserService.getUserByEmail(email);

        validateFilters(fromDate, toDate, active);
        DateRangeDTO period = DateRangeDTO.builder()
                .from(fromDate)
                .to(toDate)
                .build();

        Specification<GuestsBook> spec = GuestsPdfSpecifications.belongsToUser(user.getUserId())
                .and(GuestsPdfSpecifications.isForeign()) // Filter at DB level!
                .and(GuestsPdfSpecifications.dateOfArrival(fromDate))
                .and(GuestsPdfSpecifications.dateOfDeparture(toDate));

        List<ForeignGuestsEntry> entries = foreignGuestsBookRepository.findAll(spec).stream()
                .filter(gb -> !gb.getIsLocal())
                .map(fgb -> modelMapper.map(fgb, ForeignGuestsEntry.class))
                .toList();

        if(entries.isEmpty()) {
            throw new NoRelevantGuestsException("No guests were found for this query/user.");
        }

        System.out.println("ENTRIES: " + entries);



        return ForeignGuestsBookDTO.builder()
                .period(period)
                .entries(entries)
                .build();
    }

    private void validateFilters(
            LocalDate fromDate,
            LocalDate toDate,
            Boolean active
    ) {
        if (fromDate == null && toDate == null && active == null) {
            throw new IllegalArgumentException(
                    "PDF export requires either date range or active flag"
            );
        }

        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw new IllegalArgumentException(
                    "'fromDate' must be before or equal to 'toDate'"
            );
        }
    }
}
