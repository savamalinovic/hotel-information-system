package org.unibl.etf.efikas.repositories;
import org.springframework.data.jpa.repository.JpaRepository; import org.unibl.etf.efikas.models.entities.TaskStatusHistory; import java.util.List;
public interface TaskStatusHistoryRepository extends JpaRepository<TaskStatusHistory,Long>{ List<TaskStatusHistory> findByTaskTaskIdOrderByChangedAtAscIdAsc(Long taskId); }
