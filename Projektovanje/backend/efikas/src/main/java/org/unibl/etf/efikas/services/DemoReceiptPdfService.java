package org.unibl.etf.efikas.services;

import com.itextpdf.io.font.PdfEncodings;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.properties.TextAlignment;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.unibl.etf.efikas.exceptions.BookPdfGenerationException;
import org.unibl.etf.efikas.models.entities.DemoReceipt;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Service
public class DemoReceiptPdfService {
    private static final ZoneId HOTEL_ZONE = ZoneId.of("Europe/Sarajevo");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd.MM.yyyy");
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss");

    @Value("classpath:fonts/DejaVuSans.ttf")
    private Resource fontResource;

    public byte[] generate(DemoReceipt receipt) {
        try (ByteArrayOutputStream output = new ByteArrayOutputStream();
             PdfWriter writer = new PdfWriter(output);
             PdfDocument pdf = new PdfDocument(writer);
             Document document = new Document(pdf)) {
            PdfFont font = PdfFontFactory.createFont(
                    fontResource.getInputStream().readAllBytes(), PdfEncodings.IDENTITY_H);
            document.setFont(font);
            pdf.getDocumentInfo().setTitle(receipt.getReceiptNumber());
            pdf.getDocumentInfo().setAuthor("eFikas");

            document.add(new Paragraph("DEMO – NIJE FISKALNI RAČUN")
                    .setFontSize(18).setTextAlignment(TextAlignment.CENTER));
            document.add(new Paragraph(receipt.getHotelName())
                    .setFontSize(14).setTextAlignment(TextAlignment.CENTER));
            add(document, "Adresa hotela", receipt.getHotelAddress());
            add(document, "Poreski identifikator", receipt.getHotelTaxId());
            document.add(new Paragraph(" "));
            add(document, "Broj demo računa", receipt.getReceiptNumber());
            add(document, "Vrijeme izdavanja", DATE_TIME.format(receipt.getIssuedAt().atZone(HOTEL_ZONE)));
            add(document, "Rezervacija", receipt.getReservation().getReservationId().toString());
            add(document, "Gost", receipt.getPrimaryGuestName());
            add(document, "Apartman", receipt.getApartmentName());
            add(document, "Boravak", DATE.format(receipt.getCheckInDate()) + " – "
                    + DATE.format(receipt.getCheckOutDate()));
            add(document, "Broj noćenja", receipt.getNights().toString());
            add(document, "Cijena noćenja", money(receipt.getNightlyRate(), receipt.getCurrency()));
            document.add(new Paragraph(" "));
            add(document, "Usluga smještaja", money(receipt.getTotalAmount(), receipt.getCurrency()));
            add(document, "PDV", money(receipt.getVatAmount(), receipt.getCurrency()));
            document.add(new Paragraph("UKUPNO: " + money(receipt.getTotalAmount(), receipt.getCurrency()))
                    .setFontSize(15).setTextAlignment(TextAlignment.RIGHT));
            document.add(new Paragraph("Izdao/la: " + receipt.getIssuedBy().getName() + " "
                    + receipt.getIssuedBy().getSurname()));
            document.add(new Paragraph("Ovaj dokument služi isključivo za demonstraciju sistema i nije fiskalni račun.")
                    .setTextAlignment(TextAlignment.CENTER));
            document.close();
            return output.toByteArray();
        } catch (IOException | RuntimeException exception) {
            throw new BookPdfGenerationException("The demo receipt PDF could not be generated.");
        }
    }

    private static void add(Document document, String label, String value) {
        if (value != null && !value.isBlank()) {
            document.add(new Paragraph(label + ": " + value));
        }
    }

    private static String money(java.math.BigDecimal value, String currency) {
        return value.toPlainString() + " " + currency;
    }
}
