package org.unibl.etf.efikas.controllers;
import io.swagger.v3.oas.annotations.security.SecurityRequirement; import io.swagger.v3.oas.annotations.tags.Tag; import jakarta.validation.Valid; import lombok.RequiredArgsConstructor; import org.springframework.data.domain.Pageable; import org.springframework.data.domain.Sort; import org.springframework.data.web.PageableDefault; import org.springframework.http.*; import org.springframework.security.core.Authentication; import org.springframework.web.bind.annotation.*; import org.springframework.web.multipart.MultipartFile; import org.springframework.web.servlet.support.ServletUriComponentsBuilder; import org.unibl.etf.efikas.configs.OpenApiConfig; import org.unibl.etf.efikas.models.enums.TaskStatus; import org.unibl.etf.efikas.models.requests.*; import org.unibl.etf.efikas.models.responses.*; import org.unibl.etf.efikas.services.TaskService; import java.net.URI; import java.util.List;
@RestController @RequestMapping("/api/v1/tasks") @RequiredArgsConstructor @Tag(name="Operational tasks") @SecurityRequirement(name=OpenApiConfig.BEARER_AUTH)
public class TaskController {
 private final TaskService service;
 @PostMapping public ResponseEntity<TaskResponse> create(Authentication a,@Valid @RequestBody CreateTaskRequest r){TaskResponse body=service.create(a.getName(),r);URI uri=ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(body.taskId()).toUri();return ResponseEntity.created(uri).body(body);}
 @GetMapping public PageResponse<TaskResponse> list(@RequestParam(required=false) TaskStatus status,@RequestParam(required=false) Short specializationId,@RequestParam(required=false) Integer apartmentId,@RequestParam(required=false) Integer reservationId,@RequestParam(required=false) Integer assignedWorkerId,Pageable pageable){return service.list(status,specializationId,apartmentId,reservationId,assignedWorkerId,pageable);}
 @GetMapping("/available") public PageResponse<TaskResponse> available(Authentication a,Pageable p){return service.available(a.getName(),p);}
 @GetMapping("/mine") public PageResponse<TaskResponse> mine(Authentication a,@RequestParam(required=false) TaskStatus status,@PageableDefault(size=20,sort={"updatedAt","taskId"},direction=Sort.Direction.DESC) Pageable p){return service.mine(a.getName(),status,p);}
 @GetMapping("/{id}") public TaskResponse get(Authentication a,@PathVariable Long id){return service.get(a.getName(),id);}
 @GetMapping("/{id}/history") public List<TaskHistoryResponse> history(Authentication a,@PathVariable Long id){return service.history(a.getName(),id);}
 @PostMapping("/{id}/claim") public TaskResponse claim(Authentication a,@PathVariable Long id){return service.claim(a.getName(),id);}
 @PostMapping("/{id}/start") public TaskResponse start(Authentication a,@PathVariable Long id){return service.start(a.getName(),id);}
 @PostMapping("/{id}/block") public TaskResponse block(Authentication a,@PathVariable Long id,@Valid @RequestBody TaskReasonRequest r){return service.block(a.getName(),id,r.reason());}
 @PostMapping("/{id}/resume") public TaskResponse resume(Authentication a,@PathVariable Long id){return service.resume(a.getName(),id);}
 @PostMapping("/{id}/complete") public TaskResponse complete(Authentication a,@PathVariable Long id){return service.complete(a.getName(),id);}
 @PostMapping("/{id}/cancel") public TaskResponse cancel(Authentication a,@PathVariable Long id,@Valid @RequestBody TaskReasonRequest r){return service.cancel(a.getName(),id,r.reason());}
 @PostMapping(value="/{id}/attachments",consumes=MediaType.MULTIPART_FORM_DATA_VALUE) public ResponseEntity<TaskAttachmentResponse> attach(Authentication a,@PathVariable Long id,@RequestPart MultipartFile file){return ResponseEntity.status(HttpStatus.CREATED).body(service.attach(a.getName(),id,file));}
 @GetMapping("/{id}/attachments") public List<TaskAttachmentResponse> attachments(Authentication a,@PathVariable Long id){return service.attachments(a.getName(),id);}
}
