package org.unibl.etf.efikas.repositories;
import org.springframework.data.jpa.repository.JpaRepository; import org.unibl.etf.efikas.models.entities.TaskAttachment; import java.util.List;
public interface TaskAttachmentRepository extends JpaRepository<TaskAttachment,Long>{ List<TaskAttachment> findByTaskTaskIdOrderByUploadedAtAscIdAsc(Long taskId); }
