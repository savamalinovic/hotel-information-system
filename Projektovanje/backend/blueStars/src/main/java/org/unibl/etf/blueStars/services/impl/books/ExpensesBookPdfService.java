package org.unibl.etf.blueStars.services.impl.books;

import org.springframework.stereotype.Service;
import org.unibl.etf.blueStars.models.dto.books.ExpensesBookDTO;
import org.unibl.etf.blueStars.models.enums.BookType;
import org.unibl.etf.blueStars.handlers.BookTypeHandler;

import java.io.IOException;
import java.io.InputStream;

@Service
public class ExpensesBookPdfService extends BaseBookPdfService<ExpensesBookDTO> implements BookTypeHandler {

    @Override
    public InputStream generatePdf(ExpensesBookDTO request) throws IOException {
        return null;
    }

    @Override
    public BookType getSupportedType() {
        return BookType.EXPENSES;
    }
}
