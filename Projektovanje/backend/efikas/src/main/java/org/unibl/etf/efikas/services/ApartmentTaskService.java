package org.unibl.etf.efikas.services;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.unibl.etf.efikas.models.dto.ApartmentTaskDTO;
import org.unibl.etf.efikas.models.dto.ApartmentTaskNotificationDTO;
import org.unibl.etf.efikas.models.entities.Apartment;
import org.unibl.etf.efikas.models.entities.ApartmentTask;
import org.unibl.etf.efikas.models.entities.ApartmentTaskId;
import org.unibl.etf.efikas.models.responses.ApartmentTaskResponse;
import org.unibl.etf.efikas.repositories.ApartmentTaskRepository;
import org.unibl.etf.efikas.repositories.ApartmentRepository;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ApartmentTaskService {

    private final ApartmentTaskRepository apartmentTaskRepository;
    private final ApartmentRepository apartmentRepository;
    private final ModelMapper modelMapper;

    // Obtain all apartment tasks for a given apartment
    public List<ApartmentTaskResponse> getAllApartmentTasksForApartment(Integer apartmentId, Authentication authentication) {
        return apartmentTaskRepository.findApartmentTaskByApartmentApartmentId(apartmentId)
                .stream().map((element) -> modelMapper.map(element, ApartmentTaskResponse.class))
                .collect(Collectors.toList());
    }

    // Obtain all apartment tasks that aren't finished and between the given date
    public List<ApartmentTaskNotificationDTO> getAllByDueDateTimeBetween(Instant from, Instant to) {
        return apartmentTaskRepository.findUpcomingTaskNotifications(from, to);
    }

    // Create a new Task for a given apartment
    public ApartmentTaskResponse createNewApartmentTask(Integer apartmentId, Authentication authentication, ApartmentTaskDTO task) {
        ApartmentTask apartmentTask = modelMapper.map(task, ApartmentTask.class);

        Apartment apartment = apartmentRepository.findById(apartmentId)
                .orElseThrow(() -> new EntityNotFoundException("Apartment not found!"));

        apartmentTask.setApartment(apartment);
        ApartmentTaskId id = new ApartmentTaskId();
        id.setApartmentId(apartmentId);
        id.setName(task.getName());

        apartmentTask.setId(id);

        apartmentTaskRepository.save(apartmentTask);

        return modelMapper.map(apartmentTask, ApartmentTaskResponse.class);
    }

    public ApartmentTaskResponse updateApartmentTask(Integer apartmentId, Authentication authentication, ApartmentTaskDTO task, String apartmentTaskName) {
        ApartmentTaskId apartmentTaskId = new ApartmentTaskId();
        apartmentTaskId.setApartmentId(apartmentId);
        apartmentTaskId.setName(apartmentTaskName);

        ApartmentTask apartmentTask = apartmentTaskRepository.findApartmentTaskById(apartmentTaskId)
                .orElseThrow(() -> new EntityNotFoundException("Apartment Task not found!"));

        apartmentRepository.findById(apartmentId)
                .orElseThrow(() -> new EntityNotFoundException("Apartment not found!"));

        apartmentTaskRepository.delete(apartmentTask);

        modelMapper.map(task, apartmentTask);

        String newName = task.getName();
        if(newName != null && !newName.equals(apartmentTask.getId().getName())) {
            ApartmentTaskId newId = new ApartmentTaskId();
            newId.setApartmentId(apartmentId);
            newId.setName(newName);

            apartmentTask.setId(newId);
        }

        apartmentTaskRepository.save(apartmentTask);

        return modelMapper.map(apartmentTask, ApartmentTaskResponse.class);
    }

    public ApartmentTaskResponse deleteApartmentTask(Integer apartmentId, Authentication authentication, String apartmentTaskName) {
        ApartmentTaskId apartmentTaskId = new ApartmentTaskId();
        apartmentTaskId.setApartmentId(apartmentId);
        apartmentTaskId.setName(apartmentTaskName);

        ApartmentTask apartmentTask = apartmentTaskRepository.findApartmentTaskById(apartmentTaskId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Apartment Task not found!"));

        apartmentTaskRepository.delete(apartmentTask);

        return modelMapper.map(apartmentTask, ApartmentTaskResponse.class);
    }



}
