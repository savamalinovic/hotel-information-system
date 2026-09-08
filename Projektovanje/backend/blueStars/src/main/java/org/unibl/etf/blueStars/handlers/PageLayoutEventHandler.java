package org.unibl.etf.blueStars.handlers;

import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.geom.Rectangle;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfPage;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import com.itextpdf.kernel.pdf.event.AbstractPdfDocumentEvent;
import com.itextpdf.kernel.pdf.event.AbstractPdfDocumentEventHandler;
import com.itextpdf.kernel.pdf.event.PdfDocumentEvent;
import com.itextpdf.layout.Canvas;
import com.itextpdf.layout.element.Div;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import lombok.AllArgsConstructor;
import org.unibl.etf.blueStars.models.dto.DateRangeDTO;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Handler for handling PDF events, such as creation of the header of the document.
 * */
@AllArgsConstructor
public class PageLayoutEventHandler extends AbstractPdfDocumentEventHandler {

    private final Image logo;
    private final PdfFont font;
    private final DateRangeDTO period;
    private final String title;
    private final LocalDate printingDate;

    // Placeholder za ukupan broj stranica (mora biti jedinstven)
    private final String UKUPAN_BROJ_STRANICA_PLACEHOLDER = "{total}";
    private final float FOOTER_Y_POSITION = 35f;

    @Override
    protected void onAcceptedEvent(AbstractPdfDocumentEvent abstractPdfDocumentEvent) {
        PdfDocumentEvent docEvent = (PdfDocumentEvent) abstractPdfDocumentEvent;
        //PdfDocument pdfDocument = (PdfDocument) docEvent.getDocument();
        PdfPage page = docEvent.getPage();
        Rectangle pageSize = page.getPageSize();

        PdfCanvas pdfCanvas = new PdfCanvas(page.newContentStreamBefore(), page.getResources(), docEvent.getDocument());
        Canvas canvas = new Canvas(pdfCanvas, pageSize, false);

        // ---- LOGO TOP LEFT ----
        logo.setHeight(40);
        logo.setFixedPosition(pageSize.getLeft() + 40, pageSize.getTop() - 60);
        canvas.add(logo);

        // ---- TITLE TOP CENTER ----
        Paragraph title = new Paragraph(this.title)
                .setFont(font)
                .setFontSize(12)
                .simulateBold()
                .setTextAlignment(TextAlignment.CENTER);
        canvas.showTextAligned(
                title,
                pageSize.getWidth() / 2,
                pageSize.getTop() - 40,
                TextAlignment.CENTER
        );

        Paragraph subTitle = new Paragraph("Од датума: " + period.getFrom() + ", До датума: " + period.getTo())
                .setFont(font)
                .setFontSize(10)
                .setTextAlignment(TextAlignment.CENTER);
        canvas.showTextAligned(
                subTitle,
                pageSize.getWidth() / 2,
                pageSize.getTop() - 60,
                TextAlignment.CENTER
        );

        canvas.close();
    }

}
