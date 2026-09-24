package org.unibl.etf.blueStars.repositories;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import org.unibl.etf.blueStars.models.entities.AppUser;
import org.unibl.etf.blueStars.models.enums.*;
import org.unibl.etf.blueStars.models.requests.CreateTaskRequest;
import org.unibl.etf.blueStars.models.responses.FileUploadResponse;
import org.unibl.etf.blueStars.services.TaskService;
import org.unibl.etf.blueStars.services.WorkforceAvailabilityService;
import org.unibl.etf.blueStars.services.interfaces.S3Service;
import java.time.LocalDateTime;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest @Transactional
class B09TaskIntegrationTest {
 @Autowired TaskService tasks; @Autowired WorkforceAvailabilityService workforce; @Autowired AppUserRepository users; @Autowired SpecializationRepository specializations;
 @MockitoBean S3Service storage;

 @Test void completesWorkerLifecycleAndMarksAvailabilityBusy() throws Exception {
  var spec=specializations.findAll().stream().filter(s->s.getCode().equals("GENERAL_MAINTENANCE")).findFirst().orElseThrow();
  AppUser manager=save("manager",UserRole.MANAGER); AppUser worker=save("worker",UserRole.OPERATIONAL_WORKER);worker.getSpecializations().add(spec);users.saveAndFlush(worker);
  workforce.clockIn(worker.getEmail());
  var created=tasks.create(manager.getEmail(),new CreateTaskRequest(spec.getSpecializationId(),null,null,"Check boiler","Inspect pressure",TaskPriority.HIGH));
  assertThat(tasks.available(worker.getEmail(),org.springframework.data.domain.PageRequest.of(0,10)).content()).extracting("taskId").contains(created.taskId());
  assertThat(tasks.claim(worker.getEmail(),created.taskId()).status()).isEqualTo(TaskStatus.ASSIGNED);
  assertThat(workforce.current(worker.getEmail()).status()).isEqualTo(WorkerAvailabilityStatus.BUSY);
  tasks.start(worker.getEmail(),created.taskId()); tasks.block(worker.getEmail(),created.taskId(),"Waiting for a part"); tasks.resume(worker.getEmail(),created.taskId());
  assertThat(tasks.complete(worker.getEmail(),created.taskId()).status()).isEqualTo(TaskStatus.COMPLETED);
  assertThat(workforce.current(worker.getEmail()).status()).isEqualTo(WorkerAvailabilityStatus.AVAILABLE);
  assertThat(tasks.history(worker.getEmail(),created.taskId())).extracting("toStatus").containsExactly(TaskStatus.NEW,TaskStatus.ASSIGNED,TaskStatus.IN_PROGRESS,TaskStatus.BLOCKED,TaskStatus.IN_PROGRESS,TaskStatus.COMPLETED);

  when(storage.uploadFile(eq("task-attachments/"),any())).thenReturn(new FileUploadResponse("task-attachments/proof.txt", LocalDateTime.now()));
  when(storage.getPresignedUrl("task-attachments/proof.txt")).thenReturn("https://storage.invalid/proof");
  var file=new MockMultipartFile("file","proof.txt","text/plain","done".getBytes());
  assertThat(tasks.attach(worker.getEmail(),created.taskId(),file).downloadUrl()).isEqualTo("https://storage.invalid/proof");
  verify(storage).uploadFile(eq("task-attachments/"),same(file));
 }

 private AppUser save(String label,UserRole role){String s=UUID.randomUUID().toString().replace("-","").substring(0,12);AppUser u=new AppUser();u.setName("B09");u.setSurname(label);u.setJmbg(String.format("%013d",Integer.toUnsignedLong(s.hashCode())%10_000_000_000_000L));u.setPasswordHash("hash");u.setEmail("b09-"+label+"-"+s+"@example.invalid");u.setRole(role);u.setAddress("Task test address");u.setActive(true);return users.saveAndFlush(u);}
}
