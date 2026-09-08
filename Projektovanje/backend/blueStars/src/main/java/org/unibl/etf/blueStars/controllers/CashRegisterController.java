package org.unibl.etf.blueStars.controllers;

import io.swagger.v3.oas.annotations.Hidden;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.unibl.etf.blueStars.models.dto.CashRegisterDTO;
import org.unibl.etf.blueStars.models.responses.CashRegisterResponse;
import org.unibl.etf.blueStars.services.CashRegisterService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/cash-registers")
@RequiredArgsConstructor
@Hidden
public class CashRegisterController {

    private final CashRegisterService cashRegisterService;

    @PostMapping()
    public ResponseEntity<?> createCashRegister(@RequestBody CashRegisterDTO cashRegisterDTO) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        CashRegisterResponse response = cashRegisterService.createNewCashRegister(authentication, cashRegisterDTO);

        return ResponseEntity.ok(response);
    }

    @GetMapping()
    public ResponseEntity<?> getAllCashRegisters() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        List<CashRegisterResponse> response = cashRegisterService.getAllCashRegisters(authentication);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{cashRegisterId}")
    public ResponseEntity<?> getCashRegister(@PathVariable Integer cashRegisterId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        CashRegisterResponse response = cashRegisterService.getCashRegister(authentication, cashRegisterId);

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{cashRegisterId}")
    public ResponseEntity<?> deleteCashRegister(@PathVariable Integer cashRegisterId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        CashRegisterResponse response = cashRegisterService.deleteCashRegister(authentication, cashRegisterId);

        return ResponseEntity.ok(response);
    }
}
