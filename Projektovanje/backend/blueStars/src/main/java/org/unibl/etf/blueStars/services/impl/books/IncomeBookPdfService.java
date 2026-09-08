package org.unibl.etf.blueStars.services.impl.books;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.unibl.etf.blueStars.design_patterns.factory.BookTableFactory;
import org.unibl.etf.blueStars.design_patterns.strategy.interfaces.BookLayoutStrategy;
import org.unibl.etf.blueStars.models.dto.books.IncomeBookDTO;
import org.unibl.etf.blueStars.models.dto.books.entries.IncomeEntry;
import org.unibl.etf.blueStars.models.dto.itextpdf.TableConfig;
import org.unibl.etf.blueStars.models.dto.itextpdf.TableData;
import org.unibl.etf.blueStars.models.enums.BookType;
import org.unibl.etf.blueStars.models.enums.TableType;
import org.unibl.etf.blueStars.handlers.BookTypeHandler;
import org.unibl.etf.blueStars.services.IncomeBookService;
import org.unibl.etf.blueStars.util.Constants;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;

/**
 * Service for generating the PDF for income books.
 * */
@Service
public class IncomeBookPdfService extends BaseBookPdfService<IncomeBookDTO> implements BookTypeHandler {

    private final BookTableFactory bookTableFactory;
    private final IncomeBookService incomeBookService;
    private final BookLayoutStrategy<IncomeBookDTO> bookLayoutStrategy;

    public IncomeBookPdfService(BookTableFactory bookTableFactory,
                                IncomeBookService incomeBookService,
                                @Qualifier(Constants.SpringQualifiers.INCOME_BOOK_LAYOUT_STRATEGY) BookLayoutStrategy<IncomeBookDTO> bookLayoutStrategy
    ) {
        this.bookTableFactory = bookTableFactory;
        this.incomeBookService = incomeBookService;
        this.bookLayoutStrategy = bookLayoutStrategy;
    }


    @Override
    public InputStream generatePdf(IncomeBookDTO request) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try (PdfWriter writer = new PdfWriter(baos);
             Document document = createDocument(writer, request.getPeriod(), "Књига прихода")) {
            // Add taxpayer info table
            document.add(getTaxpayerTable(request));
            document.add(new Paragraph("\n"));

            // Add store info table
            document.add(getStoreTable(request));
            document.add(new Paragraph("\n"));

            // Add income table
            document.add(getIncomeTable(request));

        } catch (Exception e) {
            e.printStackTrace();
            throw new IOException("Failed to generate Income PDF", e);
        }

        return new ByteArrayInputStream(baos.toByteArray());
    }


    @Override
    public BookType getSupportedType() {
        return BookType.INCOME;
    }

    private Table getIncomeTable(IncomeBookDTO request) {
        TableData receiptData = TableData.builder()
                .title(bookLayoutStrategy.generateTitle())
                .headers(bookLayoutStrategy.generateHeaders())
                .config(bookLayoutStrategy.generateTableConfig())
                .rows(bookLayoutStrategy.getTableData(request))
                .build();

        return bookTableFactory.createTable(TableType.FINANCIAL, receiptData);
    }

    private Table getTaxpayerTable(IncomeBookDTO request) {
        TableData infoData = TableData.builder()
                .title("ОСНОВНИ ПОДАЦИ О ПОРЕСКОМ ОБВЕЗНИКУ")
                .rows(new ArrayList<>())
                .config(
                        TableConfig.builder()
                                .columnWidths(new float[]{4, 6}) // 40% : 60%
                                .hasTitleRow(true)
                                .build()
                )
                .build();

        // Use data from request
        infoData.getRows().add(List.of("ИМЕ И ПРЕЗИМЕ", request.getTaxpayer().getFullName()));
        infoData.getRows().add(List.of("ЈЕДИНСТВЕНИ МАТИЧНИ БРОЈ ГРАЂАНИНА", request.getTaxpayer().getJmbg()));
        infoData.getRows().add(List.of("АДРЕСА СТАНОВАЊА", request.getTaxpayer().getAddress()));

        return bookTableFactory.createTable(TableType.INFO, infoData);
    }

    private Table getStoreTable(IncomeBookDTO request) {
        TableData infoData = TableData.builder()
                .title("ОСНОВНИ ПОДАЦИ О РАДЊИ")
                .rows(new ArrayList<>())
                .config(
                        TableConfig.builder()
                                .columnWidths(new float[]{4, 6}) // 40% : 60%
                                .hasTitleRow(true)
                                .build()
                )
                .build();

        infoData.getRows().add(List.of("НАЗИВ", request.getStore().getName()));
        infoData.getRows().add(List.of("АДРЕСА", request.getStore().getAddress()));
        infoData.getRows().add(List.of("ДЈЕЛАТНОСТ", request.getStore().getActivity()));
        infoData.getRows().add(List.of("ШИФРА ДЈЕЛАТНОСТИ", request.getStore().getActivityCode()));
        infoData.getRows().add(List.of("ЈИБ", request.getStore().getJib()));

        return bookTableFactory.createTable(TableType.INFO, infoData);
    }
}
