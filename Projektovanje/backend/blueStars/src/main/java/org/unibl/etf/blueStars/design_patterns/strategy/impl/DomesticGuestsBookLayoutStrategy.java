package org.unibl.etf.blueStars.design_patterns.strategy.impl;

import org.springframework.stereotype.Component;
import org.unibl.etf.blueStars.design_patterns.strategy.interfaces.BookLayoutStrategy;
import org.unibl.etf.blueStars.models.dto.books.DomesticGuestsBookDTO;
import org.unibl.etf.blueStars.models.dto.books.entries.DomesticGuestsEntry;
import org.unibl.etf.blueStars.models.dto.itextpdf.TableConfig;
import org.unibl.etf.blueStars.models.enums.Gender;
import org.unibl.etf.blueStars.util.Constants;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.Temporal;
import java.util.ArrayList;
import java.util.List;

@Component(Constants.SpringQualifiers.DOMESTIC_GUESTS_BOOK_LAYOUT_STRATEGY)
public class DomesticGuestsBookLayoutStrategy implements BookLayoutStrategy<DomesticGuestsBookDTO> {
    @Override
    public String generateTitle() {
        return "КЊИГА ДОМАЋИХ ГОСТИЈУ";
    }

    @Override
    public List<String> generateHeaders() {
        return List.of(
                "Ред. бр. пријаве",
                "Име и презиме",
                "Пол",
                "Дан, мјесец и година рођења",
                "Мјесто, општина и држава рођења",
                "Адреса",
                "Јединствени матични број грађана",
                "Број и спрат смјештајне јединице",
                "Датум и вријеме доласка",
                "Датум и вријеме одласка",
                "Број издатог фискалног рачуна",
                "Примједба"
        );
    }

    @Override
    public TableConfig generateTableConfig() {
        return TableConfig.builder()
                .columnWidths(new float[]{
                        40, // "Ред. бр. пријаве",
                        40, // "Име и презиме",
                        40, // "Пол",
                        40, // "Дан, мјесец и година рођења",
                        40, // "Мјесто, општина и држава рођења",
                        40, // "Адреса",
                        40, // "Јединствени матични број грађана",
                        40, // "Број и спрат смјештајне јединице",
                        40, // "Датум и вријеме доласка",
                        40, // "Датум и вријеме одласка",
                        40, // "Број издатог фискалног рачуна",
                        40, // "Примједба"
                })
                .hasTitleRow(true)
                .hasTotalRow(false)
                .build();
    }

    @Override
    public List<List<String>> getTableData(DomesticGuestsBookDTO request) {
        // Convert request data to table rows
        List<List<String>> rows = new ArrayList<>();

        // Add all entries as rows
        for (DomesticGuestsEntry entry : request.getEntries()) {
            List<String> row = createRowFromEntry(entry);
            rows.add(row);
        }

        return rows;
    }

    private List<String> createRowFromEntry(DomesticGuestsEntry entry) {
        List<String> row = new ArrayList<>();
        String gender = entry.getGender() == Gender.Male ? "Мушки" : "Женски";
        ZoneId zone = ZoneId.systemDefault(); // system's default time zone
        LocalDateTime arrivalDateTime = LocalDateTime.ofInstant(entry.getDateTimeOfArrival(), zone);
        LocalDateTime departureDateTime = LocalDateTime.ofInstant(entry.getDateTimeOfDeparture(), zone);

        row.add(String.valueOf(entry.getId()));
        row.add(entry.getName() + " " + entry.getSurname());
        row.add(gender);
        row.add(formatDate(entry.getBirthDate()));
        row.add(entry.getBirthPlace() + ", " + entry.getBirthMunicipality() + ", " + entry.getBirthCountry());
        row.add(entry.getAddress());
        row.add(entry.getCitizenId());
        row.add(entry.getAccommodationUnitNumber() + ", " + entry.getAccommodationUnitFloor());
        row.add(formatDate(arrivalDateTime));
        row.add(formatDate(departureDateTime));
        row.add(entry.getIssuedInvoiceNumber() != null ? entry.getIssuedInvoiceNumber().toString() : "");
        row.add(entry.getRemarks() != null ? entry.getRemarks() : "");

        return row;
    }

    private String formatDate(Temporal date) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd. MM. yyyy");
        return formatter.format(date);
    }
}
