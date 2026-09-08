package org.unibl.etf.blueStars.services;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.unibl.etf.blueStars.repositories.ExpensesBookRepository;

@Service
@RequiredArgsConstructor
public class ExpensesBookService {
    private final ExpensesBookRepository expensesBookRepository;


}
