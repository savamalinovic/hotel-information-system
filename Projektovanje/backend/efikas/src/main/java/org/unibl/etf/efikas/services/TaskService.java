package org.unibl.etf.efikas.services;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.unibl.etf.efikas.exceptions.*;
import org.unibl.etf.efikas.models.entities.*;
import org.unibl.etf.efikas.models.enums.*;
import org.unibl.etf.efikas.models.requests.CreateTaskRequest;
import org.unibl.etf.efikas.models.responses.*;
import org.unibl.etf.efikas.repositories.*;
import org.unibl.etf.efikas.services.interfaces.S3Service;
import org.unibl.etf.efikas.util.Constants;
import java.io.IOException;
import java.util.*;

@Service @RequiredArgsConstructor
public class TaskService {
 private static final Set<TaskStatus> ACTIVE=Set.of(TaskStatus.ASSIGNED,TaskStatus.IN_PROGRESS);
 private final OperationalTaskRepository tasks; private final TaskStatusHistoryRepository history;
 private final TaskAttachmentRepository attachments; private final AppUserRepository users;
 private final SpecializationRepository specializations; private final ApartmentRepository apartments;
 private final ReservationRepository reservations; private final ApartmentStatusHistoryRepository apartmentHistory;
 private final WorkforceAvailabilityService workforce; private final S3Service storage;
 private final AuditLogService auditLogService;

 @Transactional public TaskResponse create(String email, CreateTaskRequest r){
  AppUser actor=user(email); Specialization spec=specializations.findById(r.specializationId()).orElseThrow(()->new EntityNotFoundException("Specialization not found."));
  Reservation reservation=r.reservationId()==null?null:reservations.findById(r.reservationId()).orElseThrow(()->new EntityNotFoundException("Reservation not found."));
  Apartment apartment=r.apartmentId()==null?(reservation==null?null:reservation.getApartment()):apartments.findById(r.apartmentId()).orElseThrow(()->new EntityNotFoundException("Apartment not found."));
  if(reservation!=null&&!reservation.getApartment().getApartmentId().equals(apartment.getApartmentId())) throw new IllegalArgumentException("Task apartment must match its reservation.");
  if("CLEANING".equals(spec.getCode())&&apartment==null) throw new IllegalArgumentException("A cleaning task requires an apartment.");
  OperationalTask t=new OperationalTask(); t.setSpecialization(spec); t.setApartment(apartment); t.setReservation(reservation); t.setCreatedBy(actor); t.setTitle(r.title().trim()); t.setDescription(r.description().trim()); t.setPriority(r.priority());
  tasks.saveAndFlush(t); record(t,null,TaskStatus.NEW,actor,"Task created."); auditLogService.record(AuditEvent.TASK_CREATED,actor,reservation,apartment,t,"Task created."); return map(t);
 }

 @Transactional(readOnly=true) public PageResponse<TaskResponse> list(TaskStatus status,Short specializationId,Integer apartmentId,Integer reservationId,Integer workerId,Pageable pageable){
  Specification<OperationalTask> s=Specification.where(null);
  if(status!=null)s=s.and((root,q,cb)->cb.equal(root.get("status"),status));
  if(specializationId!=null)s=s.and((root,q,cb)->cb.equal(root.get("specialization").get("specializationId"),specializationId));
  if(apartmentId!=null)s=s.and((root,q,cb)->cb.equal(root.get("apartment").get("apartmentId"),apartmentId));
  if(reservationId!=null)s=s.and((root,q,cb)->cb.equal(root.get("reservation").get("reservationId"),reservationId));
  if(workerId!=null)s=s.and((root,q,cb)->cb.equal(root.get("assignedWorker").get("userId"),workerId));
  return PageResponse.from(tasks.findAll(s,pageable).map(TaskService::map));
 }
 @Transactional(readOnly=true) public PageResponse<TaskResponse> available(String email,Pageable pageable){AppUser w=worker(email); return PageResponse.from(tasks.findAvailable(w.getUserId(),pageable).map(TaskService::map));}
 @Transactional(readOnly=true) public TaskResponse get(String email,Long id){OperationalTask t=require(id); assertVisible(user(email),t); return map(t);}
 @Transactional(readOnly=true) public List<TaskHistoryResponse> history(String email,Long id){OperationalTask t=require(id);assertVisible(user(email),t);return history.findByTaskTaskIdOrderByChangedAtAscIdAsc(id).stream().map(h->new TaskHistoryResponse(h.getId(),h.getFromStatus(),h.getToStatus(),h.getActor().getUserId(),h.getReason(),h.getChangedAt())).toList();}

 @Transactional public TaskResponse claim(String email,Long id){
  AppUser w=workerForUpdate(email); OperationalTask t=tasks.findByIdForUpdate(id).orElseThrow(()->new EntityNotFoundException("Task not found."));
  requireStatus(t,TaskStatus.NEW); if(w.getSpecializations().stream().noneMatch(s->s.getSpecializationId().equals(t.getSpecialization().getSpecializationId()))) throw new DomainConflictException("Worker specialization does not match the task.");
  workforce.assertAvailableForTask(w); t.setAssignedWorker(w); transition(t,TaskStatus.ASSIGNED,w,"Task claimed."); auditLogService.record(AuditEvent.TASK_CLAIMED,w,t.getReservation(),t.getApartment(),t,"Task claimed."); return map(t);
 }
 @Transactional public TaskResponse start(String email,Long id){AppUser w=workerForUpdate(email);OperationalTask t=ownedForUpdate(w,id);requireStatus(t,TaskStatus.ASSIGNED);if(isCleaning(t)){Apartment a=apartments.findByIdForUpdate(t.getApartment().getApartmentId()).orElseThrow();if(a.getOperationalStatus()!=ApartmentOperationalStatus.DIRTY)throw new DomainConflictException("Apartment must be DIRTY before cleaning starts.");setApartmentStatus(a,ApartmentOperationalStatus.CLEANING,w,"Cleaning task started.");}transition(t,TaskStatus.IN_PROGRESS,w,"Task started.");auditLogService.record(AuditEvent.TASK_STARTED,w,t.getReservation(),t.getApartment(),t,"Task started.");return map(t);}
 @Transactional public TaskResponse block(String email,Long id,String reason){AppUser w=workerForUpdate(email);OperationalTask t=ownedForUpdate(w,id);requireStatus(t,TaskStatus.IN_PROGRESS);transition(t,TaskStatus.BLOCKED,w,reason);auditLogService.record(AuditEvent.TASK_BLOCKED,w,t.getReservation(),t.getApartment(),t,reason);return map(t);}
 @Transactional public TaskResponse resume(String email,Long id){AppUser w=workerForUpdate(email);OperationalTask t=ownedForUpdate(w,id);requireStatus(t,TaskStatus.BLOCKED);workforce.assertAvailableForTask(w);transition(t,TaskStatus.IN_PROGRESS,w,"Task resumed.");auditLogService.record(AuditEvent.TASK_RESUMED,w,t.getReservation(),t.getApartment(),t,"Task resumed.");return map(t);}
 @Transactional public TaskResponse complete(String email,Long id){AppUser w=workerForUpdate(email);OperationalTask t=ownedForUpdate(w,id);requireStatus(t,TaskStatus.IN_PROGRESS);if(isCleaning(t)){Apartment a=apartments.findByIdForUpdate(t.getApartment().getApartmentId()).orElseThrow();if(a.getOperationalStatus()!=ApartmentOperationalStatus.CLEANING)throw new DomainConflictException("Apartment is not being cleaned.");setApartmentStatus(a,ApartmentOperationalStatus.READY,w,"Cleaning task completed.");}transition(t,TaskStatus.COMPLETED,w,"Task completed.");auditLogService.record(AuditEvent.TASK_COMPLETED,w,t.getReservation(),t.getApartment(),t,"Task completed.");return map(t);}
 @Transactional public TaskResponse cancel(String email,Long id,String reason){AppUser a=user(email);OperationalTask t=tasks.findByIdForUpdate(id).orElseThrow(()->new EntityNotFoundException("Task not found."));if(t.getStatus()==TaskStatus.COMPLETED||t.getStatus()==TaskStatus.CANCELLED)throw new DomainConflictException("Terminal task cannot be cancelled.");if(isCleaning(t)&&t.getStatus()==TaskStatus.IN_PROGRESS){Apartment ap=apartments.findByIdForUpdate(t.getApartment().getApartmentId()).orElseThrow();setApartmentStatus(ap,ApartmentOperationalStatus.DIRTY,a,"Cleaning task cancelled.");}transition(t,TaskStatus.CANCELLED,a,reason);auditLogService.record(AuditEvent.TASK_CANCELLED,a,t.getReservation(),t.getApartment(),t,reason);return map(t);}

 @Transactional public TaskAttachmentResponse attach(String email,Long id,MultipartFile file){if(file.isEmpty()||file.getSize()>10485760)throw new IllegalArgumentException("Attachment must contain 1 byte to 10 MB.");AppUser a=user(email);OperationalTask t=require(id);assertVisible(a,t);if(a.getRole()==UserRole.OPERATIONAL_WORKER&&(t.getAssignedWorker()==null||!t.getAssignedWorker().getUserId().equals(a.getUserId())))throw new org.springframework.security.access.AccessDeniedException("Only the assigned worker can attach a file.");try{FileUploadResponse uploaded=storage.uploadFile(Constants.Aws.TASK_ATTACHMENTS_FOLDER_PREFIX,file);TaskAttachment x=new TaskAttachment();x.setTask(t);x.setStorageKey(uploaded.getFilePath());x.setOriginalName(Optional.ofNullable(file.getOriginalFilename()).orElse("attachment"));x.setContentType(file.getContentType());x.setSizeBytes(file.getSize());x.setUploadedBy(a);attachments.saveAndFlush(x);return attachment(x);}catch(IOException e){throw new S3UploadException();}}
 @Transactional(readOnly=true) public List<TaskAttachmentResponse> attachments(String email,Long id){OperationalTask t=require(id);assertVisible(user(email),t);return attachments.findByTaskTaskIdOrderByUploadedAtAscIdAsc(id).stream().map(this::attachment).toList();}

 private OperationalTask ownedForUpdate(AppUser w,Long id){OperationalTask t=tasks.findByIdForUpdate(id).orElseThrow(()->new EntityNotFoundException("Task not found."));if(t.getAssignedWorker()==null||!t.getAssignedWorker().getUserId().equals(w.getUserId()))throw new org.springframework.security.access.AccessDeniedException("Task is assigned to another worker.");return t;}
 private void transition(OperationalTask t,TaskStatus to,AppUser actor,String reason){TaskStatus from=t.getStatus();t.setStatus(to);tasks.saveAndFlush(t);record(t,from,to,actor,reason);}
 private void record(OperationalTask t,TaskStatus from,TaskStatus to,AppUser actor,String reason){TaskStatusHistory h=new TaskStatusHistory();h.setTask(t);h.setFromStatus(from);h.setToStatus(to);h.setActor(actor);h.setReason(reason.trim());history.saveAndFlush(h);}
 private void setApartmentStatus(Apartment a,ApartmentOperationalStatus status,AppUser actor,String reason){a.setOperationalStatus(status);apartments.saveAndFlush(a);ApartmentStatusHistory h=new ApartmentStatusHistory();h.setApartment(a);h.setStatus(status);h.setChangedBy(actor);h.setReason(reason);apartmentHistory.saveAndFlush(h);}
 private AppUser user(String email){return users.findByEmailIgnoreCase(email).orElseThrow(()->new EntityNotFoundException("Authenticated user not found."));}
 private AppUser worker(String email){AppUser w=user(email);if(!w.isActive()||w.getRole()!=UserRole.OPERATIONAL_WORKER)throw new DomainConflictException("Active operational worker required.");return w;}
 private AppUser workerForUpdate(String email){AppUser w=users.findByEmailIgnoreCaseForUpdate(email).orElseThrow(()->new EntityNotFoundException("Authenticated user not found."));if(!w.isActive()||w.getRole()!=UserRole.OPERATIONAL_WORKER)throw new DomainConflictException("Active operational worker required.");return w;}
 private OperationalTask require(Long id){return tasks.findById(id).orElseThrow(()->new EntityNotFoundException("Task not found."));}
 private static void requireStatus(OperationalTask t,TaskStatus status){if(t.getStatus()!=status)throw new DomainConflictException("Task is not in "+status+" status.");}
 private static boolean isCleaning(OperationalTask t){return "CLEANING".equals(t.getSpecialization().getCode());}
 private static void assertVisible(AppUser a,OperationalTask t){boolean compatible=a.getSpecializations().stream().anyMatch(s->s.getSpecializationId().equals(t.getSpecialization().getSpecializationId()));if(a.getRole()==UserRole.OPERATIONAL_WORKER&&(t.getAssignedWorker()==null?!compatible:!t.getAssignedWorker().getUserId().equals(a.getUserId())))throw new org.springframework.security.access.AccessDeniedException("Task is not visible to this worker.");}
 private static TaskResponse map(OperationalTask t){return new TaskResponse(t.getTaskId(),t.getSpecialization().getSpecializationId(),t.getSpecialization().getCode(),t.getApartment()==null?null:t.getApartment().getApartmentId(),t.getReservation()==null?null:t.getReservation().getReservationId(),t.getAssignedWorker()==null?null:t.getAssignedWorker().getUserId(),t.getTitle(),t.getDescription(),t.getPriority(),t.getStatus(),t.getCreatedAt(),t.getUpdatedAt());}
 private TaskAttachmentResponse attachment(TaskAttachment a){return new TaskAttachmentResponse(a.getId(),a.getOriginalName(),a.getContentType(),a.getSizeBytes(),a.getUploadedBy().getUserId(),a.getUploadedAt(),storage.getPresignedUrl(a.getStorageKey()));}
}
