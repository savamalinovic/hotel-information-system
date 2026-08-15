package org.unibl.etf.efikas.repositories;
import jakarta.persistence.LockModeType; import org.springframework.data.domain.*; import org.springframework.data.jpa.repository.*; import org.springframework.stereotype.Repository; import org.unibl.etf.efikas.models.entities.OperationalTask; import org.unibl.etf.efikas.models.enums.TaskStatus; import java.util.*;
import org.unibl.etf.efikas.models.enums.TaskSource;
@Repository public interface OperationalTaskRepository extends JpaRepository<OperationalTask,Long>, JpaSpecificationExecutor<OperationalTask>{
 @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select t from OperationalTask t where t.taskId=:id") Optional<OperationalTask> findByIdForUpdate(Long id);
 boolean existsByAssignedWorkerUserIdAndStatusIn(Integer workerId, Collection<TaskStatus> statuses);
 boolean existsByAssignedWorkerUserIdAndApartmentApartmentIdAndStatusIn(
         Integer workerId, Integer apartmentId, Collection<TaskStatus> statuses);
 @Query("select t from OperationalTask t join t.assignedWorker w where w.userId=:workerId and t.status in :statuses") List<OperationalTask> findActive(Integer workerId, Collection<TaskStatus> statuses);
 @Query("select t from OperationalTask t join t.specialization s join AppUser u on u.userId=:workerId join u.specializations us where t.status=org.unibl.etf.efikas.models.enums.TaskStatus.NEW and us.specializationId=s.specializationId") Page<OperationalTask> findAvailable(Integer workerId, Pageable pageable);
 Optional<OperationalTask> findByReservationReservationIdAndSource(Integer reservationId, TaskSource source);
}
