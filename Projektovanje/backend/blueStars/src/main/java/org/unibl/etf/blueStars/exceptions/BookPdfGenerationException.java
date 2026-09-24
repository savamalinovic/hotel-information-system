package org.unibl.etf.blueStars.exceptions;

public class BookPdfGenerationException extends RuntimeException {

    public BookPdfGenerationException() { super("Exception occured during PDF generation of a book."); }

    public BookPdfGenerationException(String message) { super(message); }
}
