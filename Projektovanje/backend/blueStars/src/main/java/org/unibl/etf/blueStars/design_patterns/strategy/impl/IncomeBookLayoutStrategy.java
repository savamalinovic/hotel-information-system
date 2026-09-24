package org.unibl.etf.blueStars.design_patterns.strategy.impl;

import com.itextpdf.layout.element.Table;
import org.springframework.stereotype.Component;
import org.unibl.etf.blueStars.design_patterns.strategy.interfaces.BookLayoutStrategy;
import org.unibl.etf.blueStars.models.dto.books.IncomeBookDTO;
import org.unibl.etf.blueStars.models.dto.books.entries.IncomeEntry;
import org.unibl.etf.blueStars.models.dto.itextpdf.TableConfig;
import org.unibl.etf.blueStars.models.dto.itextpdf.TableData;
import org.unibl.etf.blueStars.models.enums.TableType;
import org.unibl.etf.blueStars.util.Constants;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;

@Component(Constants.SpringQualifiers.INCOME_BOOK_LAYOUT_STRATEGY)
public class IncomeBookLayoutStrategy implements BookLayoutStrategy<IncomeBookDTO> {

    @Override
    public String generateTitle() {
        return "КЊИГА ПРИХОДА";
    }

    @Override
    public List<String> generateHeaders() {
        return List.of(
                "Ред. бр.",
                "Датум књижења",
                "Опис промјене (назив, број и датум документа за књижење)",
                "Наплаћени приходи од продаје производа",
                "Наплаћени приходи од продаје робе",
                "Наплаћени приходи од продаје услуга",
                "Наплаћени остали приходи",
                "Наплаћени финансијски приходи",
                "Укупно наплаћени приходи",
                "Обрачунати ПДВ"
        );
    }

    @Override
    public TableConfig generateTableConfig() {
        return TableConfig.builder()
                .columnWidths(new float[]{
                        40,   // Ред. бр.
                        70,   // Датум
                        150,  // Опис промјене
                        60,   // Производи
                        60,   // Роба
                        60,   // Услуге
                        60,   // Остали приходи
                        60,   // Финансијски приходи
                        70,   // Укупно
                        60    // ПДВ
                })
                .hasTitleRow(true)
                .hasTotalRow(true)
                .build();
    }

    @Override
    public List<List<String>> getTableData(IncomeBookDTO request) {
        // Convert request data to table rows
        List<List<String>> rows = new ArrayList<>();

        // 1. Check if there is any previous income, if yes add it as a row
        if(request.getBroughtState() != null) {
            request.getBroughtState().setAccountingDate(null);
            request.getBroughtState().setDescription("Донесено стање");
            List<String> broughtStateRow = createRowFromEntry(request.getBroughtState());
            rows.add(broughtStateRow);
        }

        // 2. Add all other entries as rows
        for (IncomeEntry entry : request.getEntries()) {
            List<String> row = createRowFromEntry(entry);
            rows.add(row);
        }

        // 3. Add the total, cumulative state (of columns) at the end
        List<String> row = calculateRowTotalForTransfer(request);
        rows.add(row);

        return rows;
    }

    private List<String> createRowFromEntry(IncomeEntry entry) {
        List<String> row = new ArrayList<>();
        String id = entry.getId() != null ? String.valueOf(entry.getId()) : "";
        String date = entry.getAccountingDate() != null ? entry.getAccountingDate().format(DateTimeFormatter.ofPattern("dd.MM.yyyy"))
                : "";

        row.add(id);
        row.add(date);
        row.add(entry.getDescription());
        row.add(formatAmount(entry.getProductSaleRevenue()));
        row.add(formatAmount(entry.getGoodsSaleRevenue()));
        row.add(formatAmount(entry.getServiceSaleRevenue()));
        row.add(formatAmount(entry.getOtherRevenue()));
        row.add(formatAmount(entry.getFinancialRevenue()));
        row.add(formatAmount(entry.getTotalRevenue()));
        row.add(formatAmount(entry.getVatAmount()));

        return row;
    }

    private List<String> calculateRowTotalForTransfer(IncomeBookDTO request) {
        IncomeEntry entryFromBroughtState = request.getBroughtState() != null
                ? request.getBroughtState()
                : IncomeEntry.builder().build(); // all zeros

        IncomeEntry entry = IncomeEntry.builder()
                .id(null)
                .accountingDate(null)
                .description("Укупно за пренос")
                .productSaleRevenue(sum(request.getEntries(), IncomeEntry::getProductSaleRevenue, entryFromBroughtState))
                .goodsSaleRevenue(sum(request.getEntries(), IncomeEntry::getGoodsSaleRevenue, entryFromBroughtState))
                .serviceSaleRevenue(sum(request.getEntries(), IncomeEntry::getServiceSaleRevenue, entryFromBroughtState))
                .otherRevenue(sum(request.getEntries(), IncomeEntry::getOtherRevenue, entryFromBroughtState))
                .financialRevenue(sum(request.getEntries(), IncomeEntry::getFinancialRevenue, entryFromBroughtState))
                .totalRevenue(sum(request.getEntries(), IncomeEntry::getTotalRevenue, entryFromBroughtState))
                .vatAmount(sum(request.getEntries(), IncomeEntry::getVatAmount, entryFromBroughtState))
                .build();

        return createRowFromEntry(entry);
    }

    private BigDecimal sum(List<IncomeEntry> list, Function<IncomeEntry, BigDecimal> getter, IncomeEntry entryFromBroughtState) {
        BigDecimal listSum = list == null ? BigDecimal.ZERO :
                list.stream()
                        .map(getter)
                        .filter(Objects::nonNull)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal broughtValue = Optional.ofNullable(getter.apply(entryFromBroughtState))
                .orElse(BigDecimal.ZERO);

        return listSum.add(broughtValue);
    }

    private String formatAmount(BigDecimal amount) {
        if (amount == null) return "";
        return String.format("%.2f", amount);
    }
}
