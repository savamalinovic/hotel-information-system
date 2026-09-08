package org.unibl.etf.blueStars.design_patterns.strategy.impl;

import org.springframework.stereotype.Component;
import org.unibl.etf.blueStars.design_patterns.strategy.interfaces.BookLayoutStrategy;
import org.unibl.etf.blueStars.models.dto.books.ForeignGuestsBookDTO;
import org.unibl.etf.blueStars.models.dto.books.entries.ForeignGuestsEntry;
import org.unibl.etf.blueStars.models.dto.itextpdf.TableConfig;
import org.unibl.etf.blueStars.models.enums.Gender;
import org.unibl.etf.blueStars.util.Constants;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.Temporal;
import java.util.ArrayList;
import java.util.List;

@Component(Constants.SpringQualifiers.FOREIGN_GUESTS_BOOK_LAYOUT_STRATEGY)
public class ForeignGuestsBookLayoutStrategy implements BookLayoutStrategy<ForeignGuestsBookDTO> {

    @Override
    public String generateTitle() {
        return "КЊИГА СТРАНИХ ГОСТИЈУ";
    }

    @Override
    public List<String> generateHeaders() {
        return List.of(
                "Ред. бр. пријаве",
                "Име и презиме",
                "Пол",
                "Дан, мјесец и година рођења",
                "Мјесто и држава рођења",
                "Адреса",
                "Држављанство",
                "Број и датум издавања путне исправе",
                "Врста и број визе",
                "Датум дозволе боравка",    // TODO: fali iz baze !!!
                "Датум и мјесто уласка у БиХ",
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
                        40, // "Ред. бр.",
                        40, // "Име и презиме",
                        40, // "Пол",
                        40, // "Дан, мјесец и година рођења",
                        40, // "Мјесто и држава рођења",
                        40, // "Адреса",
                        40, // "Држављанство",
                        40, // "Број и датум издавања путне исправе",
                        40, // "Врста и број визе",
                        40, // "Датум дозволе боравка",
                        40, // "Датум и мјесто уласка у БиХ",
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
    public List<List<String>> getTableData(ForeignGuestsBookDTO request) {
        // Convert request data to table rows
        List<List<String>> rows = new ArrayList<>();

        // Add all entries as rows
        for (ForeignGuestsEntry entry : request.getEntries()) {
            List<String> row = createRowFromEntry(entry);
            rows.add(row);
        }

        return rows;
    }

    private List<String> createRowFromEntry(ForeignGuestsEntry entry) {
        List<String> row = new ArrayList<>();
        String gender = entry.getGender() == Gender.Male ? "Мушки" : "Женски";
        ZoneId zone = ZoneId.systemDefault(); // system's default time zone
        LocalDateTime arrivalDateTime = LocalDateTime.ofInstant(entry.getDateTimeOfArrival(), zone);
        LocalDateTime departureDateTime = LocalDateTime.ofInstant(entry.getDateTimeOfDeparture(), zone);

        row.add(String.valueOf(entry.getId()));
        row.add(entry.getName() + " " + entry.getSurname());
        row.add(gender);
        row.add(formatDate(entry.getBirthDate()));
        row.add(entry.getBirthPlace() + ", " + entry.getBirthCountry());
        row.add(entry.getAddress());
        row.add(entry.getCitizenship());
        row.add(entry.getPassportNumber() + ", " + formatDate(entry.getPassportIssuedDate()));
        row.add(entry.getVisaType() + ", " + entry.getVisaNumber());
        row.add(formatDate(entry.getPermittedResidenceDate()));
        row.add(formatDate(entry.getEntryDate()) + ", " + entry.getEntryPlace());
        row.add(entry.getAccommodationUnitNumber() + ", " + entry.getAccommodationUnitFloor());
        row.add(formatDate(arrivalDateTime));
        row.add(formatDate(departureDateTime));
        row.add(entry.getIssuedInvoiceNumber());
        row.add(entry.getRemarks());

        return row;
    }

    private String formatDate(Temporal date) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd. MM. yyyy");
        return formatter.format(date);
    }
}
