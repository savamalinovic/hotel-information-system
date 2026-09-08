package org.unibl.etf.blueStars.services.impl.books;

import com.itextpdf.io.font.PdfEncodings;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.event.PdfDocumentEvent;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.unibl.etf.blueStars.handlers.PageLayoutEventHandler;
import org.unibl.etf.blueStars.models.dto.DateRangeDTO;
import org.unibl.etf.blueStars.models.requests.BookRequest;
import org.unibl.etf.blueStars.util.Constants;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;

/**
 * Base class for handling service of PDF creation. Defines document properties such as header, logos, etc. of the document.
 * */
public abstract class BaseBookPdfService<T extends BookRequest> {

    @Value("classpath:logos/BlueStars-logo.png")
    private Resource logoResource;

    @Value("classpath:fonts/DejaVuSans.ttf")
    private Resource fontResource;

    private PageLayoutEventHandler layoutHandler;

    /**
     * Creates the generic look of a document.
     * */
    protected Document createDocument(PdfWriter writer, DateRangeDTO dateRangeDTO, String title) throws IOException {
        PdfDocument pdf = new PdfDocument(writer);

        // Create FRESH font for each document
        byte[] fontBytes = fontResource.getInputStream().readAllBytes();
        PdfFont cyrillicFont = PdfFontFactory.createFont(fontBytes, PdfEncodings.IDENTITY_H);

        // Create FRESH logo for each document
        byte[] logoBytes = logoResource.getInputStream().readAllBytes();
        Image logo = new Image(ImageDataFactory.create(logoBytes));

        // Register header with fresh objects
        pdf.addEventHandler(PdfDocumentEvent.START_PAGE, new PageLayoutEventHandler(
                logo, cyrillicFont, dateRangeDTO, title, LocalDate.now())
        );

        // Create document
        Document document = new Document(pdf);
        document.setMargins(20, 20, 20, 20);
        document.setFont(cyrillicFont);  // Use the fresh font
        document.setFontSize(Constants.PdfFonts.GLOBAL_FONT_SIZE);
        document.add(new Paragraph("\n\n\n"));

        return document;
    }

    /**
     * Generates a PDF of a financial book.
     * @return InputStream A stream for performance reasons in case of bigger files.
     * */
    public abstract InputStream generatePdf(T request) throws IOException;

    /**
     * Poziva se iz implementirajuće klase nakon što se dokument zatvori.
     * */
    protected void finalizeDocument(PdfDocument pdf) {
        if (layoutHandler != null) {
            //layoutHandler.populateTotalPages(pdf);
            // Opcionalno, postavite handler na null ako se servis ponovo koristi
            layoutHandler = null;
        }
    }
}
