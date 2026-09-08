package org.unibl.etf.blueStars.services;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.unibl.etf.blueStars.models.dto.ApartmentExpenseDTO;
import org.unibl.etf.blueStars.models.entities.Apartment;
import org.unibl.etf.blueStars.models.entities.ApartmentExpense;
import org.unibl.etf.blueStars.models.entities.ApartmentExpenseId;
import org.unibl.etf.blueStars.models.entities.ExpenseType;
import org.unibl.etf.blueStars.models.responses.ApartmentExpenseResponse;
import org.unibl.etf.blueStars.repositories.ApartmentExpenseRepository;
import org.unibl.etf.blueStars.repositories.ApartmentRepository;
import org.unibl.etf.blueStars.repositories.ExpenseTypeRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ApartmentExpenseService {

    private final ApartmentExpenseRepository apartmentExpenseRepository;
    private final ApartmentRepository apartmentRepository;
    private final ModelMapper modelMapper;
    private final ExpenseTypeRepository expenseTypeRepository;

    // Obtain all apartment expenses for a given apartment
    public List<ApartmentExpenseResponse> getAllApartmentExpensesForApartment(Integer apartmentId, Authentication authentication) {
        return apartmentExpenseRepository.findApartmentExpenseByApartmentApartmentId(apartmentId)
                .stream().map((element) -> modelMapper.map(element, ApartmentExpenseResponse.class))
                .collect(Collectors.toList());
    }

    // Create a new expense for a given apartment
    public ApartmentExpenseResponse createNewApartmentExpense(Integer apartmentId, Authentication authentication, ApartmentExpenseDTO expense) {
        ApartmentExpense apartmentExpense = modelMapper.map(expense, ApartmentExpense.class);

        Apartment apartment = apartmentRepository.findById(apartmentId)
                .orElseThrow(() -> new EntityNotFoundException("Apartment not found!"));

        ExpenseType expenseType = expenseTypeRepository.findByName(expense.getExpenseType())
                .orElseThrow(() -> new EntityNotFoundException("Expense type not found!"));


        apartmentExpense.setApartment(apartment);
        apartmentExpense.setExpenseType(expenseType);
        ApartmentExpenseId id = new ApartmentExpenseId();
        id.setApartmentId(apartmentId);
        id.setName(expense.getName());

        apartmentExpense.setId(id);

        apartmentExpenseRepository.save(apartmentExpense);

        return modelMapper.map(apartmentExpense, ApartmentExpenseResponse.class);
    }

    @Transactional
    public ApartmentExpenseResponse updateApartmentExpense(Integer apartmentId, Authentication authentication, ApartmentExpenseDTO expenseDTO, String oldName) {

        ApartmentExpenseId oldId = new ApartmentExpenseId();
        oldId.setApartmentId(apartmentId);
        oldId.setName(oldName);

        ApartmentExpense oldExpense = apartmentExpenseRepository.findApartmentExpenseById(oldId)
                .orElseThrow(() -> new EntityNotFoundException("Apartment expense not found!"));

        ExpenseType newType = expenseTypeRepository.findByName(expenseDTO.getExpenseType())
                .orElseThrow(() -> new EntityNotFoundException("Expense type not found!"));

        Apartment apartment = oldExpense.getApartment();

        apartmentExpenseRepository.delete(oldExpense);
        apartmentExpenseRepository.flush();

        ApartmentExpense newExpense = new ApartmentExpense();
        modelMapper.map(expenseDTO, newExpense);

        newExpense.setApartment(apartment);
        newExpense.setExpenseType(newType);

        ApartmentExpenseId newId = new ApartmentExpenseId();
        newId.setApartmentId(apartmentId);
        newId.setName(expenseDTO.getName());

        newExpense.setId(newId);
        ApartmentExpense saved = apartmentExpenseRepository.save(newExpense);

        return modelMapper.map(saved, ApartmentExpenseResponse.class);
    }

    public ApartmentExpenseResponse deleteApartmentExpense(Integer apartmentId, Authentication authentication, String apartmentExpenseName) {
        ApartmentExpenseId apartmentExpenseId = new ApartmentExpenseId();
        apartmentExpenseId.setApartmentId(apartmentId);
        apartmentExpenseId.setName(apartmentExpenseName);

        ApartmentExpense apartmentExpense = apartmentExpenseRepository.findApartmentExpenseById(apartmentExpenseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Apartment expense not found!"));

        apartmentExpenseRepository.delete(apartmentExpense);

        return modelMapper.map(apartmentExpense, ApartmentExpenseResponse.class);
    }

}
