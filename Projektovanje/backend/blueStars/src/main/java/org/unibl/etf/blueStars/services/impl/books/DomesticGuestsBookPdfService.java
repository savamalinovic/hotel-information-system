package org.unibl.etf.blueStars.services.impl.books;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Table;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.unibl.etf.blueStars.design_patterns.factory.BookTableFactory;
import org.unibl.etf.blueStars.design_patterns.strategy.interfaces.BookLayoutStrategy;
import org.unibl.etf.blueStars.models.dto.books.DomesticGuestsBookDTO;
import org.unibl.etf.blueStars.models.dto.books.ForeignGuestsBookDTO;
import org.unibl.etf.blueStars.models.dto.books.entries.DomesticGuestsEntry;
import org.unibl.etf.blueStars.models.dto.itextpdf.TableData;
import org.unibl.etf.blueStars.models.enums.BookType;
import org.unibl.etf.blueStars.handlers.BookTypeHandler;
import org.unibl.etf.blueStars.models.enums.TableType;
import org.unibl.etf.blueStars.util.Constants;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

@Service
public class DomesticGuestsBookPdfService extends BaseBookPdfService<DomesticGuestsBookDTO> implements BookTypeHandler {

    private final BookTableFactory bookTableFactory;
    private final BookLayoutStrategy<DomesticGuestsBookDTO> bookLayoutStrategy;

    public DomesticGuestsBookPdfService(
            BookTableFactory bookTableFactory,
            @Qualifier(Constants.SpringQualifiers.DOMESTIC_GUESTS_BOOK_LAYOUT_STRATEGY) BookLayoutStrategy<DomesticGuestsBookDTO> bookLayoutStrategy
    ) {
        this.bookTableFactory = bookTableFactory;
        this.bookLayoutStrategy = bookLayoutStrategy;
    }

    @Override
    public InputStream generatePdf(DomesticGuestsBookDTO request) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try (PdfWriter writer = new PdfWriter(baos);
             Document document = createDocument(writer, request.getPeriod(), "Књига домаћих гостију")) {


            // Add foreign guests table
            document.add(getDomesticGuestsTable(request));

        } catch (Exception e) {
            e.printStackTrace();
            throw new IOException("Failed to generate Income PDF", e);
        }

        return new ByteArrayInputStream(baos.toByteArray());
    }

    @Override
    public BookType getSupportedType() {
        return BookType.DOMESTIC_GUESTS;
    }

    private Table getDomesticGuestsTable(DomesticGuestsBookDTO request) {
        TableData receiptData = TableData.builder()
                .title(bookLayoutStrategy.generateTitle())
                .headers(bookLayoutStrategy.generateHeaders())
                .config(bookLayoutStrategy.generateTableConfig())
                .rows(bookLayoutStrategy.getTableData(request))
                .build();

        return bookTableFactory.createTable(TableType.FINANCIAL, receiptData);
    }
}
