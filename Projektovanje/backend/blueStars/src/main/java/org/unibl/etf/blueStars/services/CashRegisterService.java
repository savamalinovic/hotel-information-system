package org.unibl.etf.blueStars.services;

import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.unibl.etf.blueStars.models.dto.CashRegisterDTO;
import org.unibl.etf.blueStars.models.entities.AppUser;
import org.unibl.etf.blueStars.models.entities.CashRegister;
import org.unibl.etf.blueStars.models.responses.CashRegisterResponse;
import org.unibl.etf.blueStars.repositories.AppUserRepository;
import org.unibl.etf.blueStars.repositories.CashRegisterRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CashRegisterService {

    private final CashRegisterRepository cashRegisterRepository;
    private final AppUserRepository appUserRepository;
    private final ModelMapper modelMapper;

    public CashRegisterResponse getCashRegister(Authentication authentication, Integer cashRegisterId) {
        CashRegister cashRegister = cashRegisterRepository.findCashRegisterByCashRegisterId(cashRegisterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cash register not found!"));

        return modelMapper.map(cashRegister, CashRegisterResponse.class);
    }

    public List<CashRegisterResponse> getAllCashRegisters(Authentication authentication) {
        String email = authentication.getName();

        return cashRegisterRepository.findByUserEmail(email).stream()
                .map((element) -> modelMapper.map(element, CashRegisterResponse.class))
                .collect(Collectors.toList());
    }

    public CashRegisterResponse createNewCashRegister(Authentication authentication, CashRegisterDTO cashRegister) {
        String email = authentication.getName();
        AppUser appUser = appUserRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found!"));

        CashRegister cashRegisterEntity = modelMapper.map(cashRegister, CashRegister.class);
        cashRegisterEntity.setUser(appUser);
        cashRegisterRepository.save(cashRegisterEntity);

        return modelMapper.map(cashRegisterEntity, CashRegisterResponse.class);
    }

    public CashRegisterResponse deleteCashRegister(Authentication authentication, Integer cashRegisterId) {
        String email = authentication.getName();
        CashRegister cashRegister = cashRegisterRepository.findCashRegisterByCashRegisterId(cashRegisterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cash register not found!"));

        cashRegisterRepository.delete(cashRegister);
        return modelMapper.map(cashRegister, CashRegisterResponse.class);
    }



}
