package org.unibl.etf.blueStars.services;

import lombok.AllArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.unibl.etf.blueStars.models.dto.AppErrorDTO;
import org.unibl.etf.blueStars.models.entities.AppError;
import org.unibl.etf.blueStars.repositories.AppErrorRepository;

@Service
@AllArgsConstructor
public class SettingsService {
    private final AppErrorRepository repository;
    private final ModelMapper mapper;

    public AppErrorDTO registerAppError(AppErrorDTO dto) {
        AppError saved = repository.save(mapper.map(dto, AppError.class));

        return mapper.map(saved, AppErrorDTO.class);
    }
}
