package org.unibl.etf.efikas.repositories;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;
import org.unibl.etf.efikas.models.entities.LeaveRequest;
import org.unibl.etf.efikas.models.enums.LeaveRequestStatus;

import java.time.LocalDate;
import java.util.Optional;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long>,
        JpaSpecificationExecutor<LeaveRequest> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select request from LeaveRequest request where request.leaveRequestId = :requestId")
    Optional<LeaveRequest> findByIdForUpdate(Long requestId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select request from LeaveRequest request
            where request.leaveRequestId = :requestId and request.worker.userId = :workerId
            """)
    Optional<LeaveRequest> findOwnedByIdForUpdate(Long requestId, Integer workerId);

    Page<LeaveRequest> findByWorkerUserIdOrderByCreatedAtDescLeaveRequestIdDesc(
            Integer workerId, Pageable pageable);

    Optional<LeaveRequest> findByLeaveRequestIdAndWorkerUserId(Long leaveRequestId, Integer workerId);

    @Query("""
            select count(request) > 0 from LeaveRequest request
            where request.worker.userId = :workerId
              and request.status in (org.unibl.etf.efikas.models.enums.LeaveRequestStatus.PENDING,
                                     org.unibl.etf.efikas.models.enums.LeaveRequestStatus.APPROVED)
              and request.startDate <= :endDate
              and request.endDate >= :startDate
            """)
    boolean existsActiveOverlap(Integer workerId, LocalDate startDate, LocalDate endDate);

    @Query("""
            select request from LeaveRequest request
            where request.worker.userId = :workerId
              and request.status = org.unibl.etf.efikas.models.enums.LeaveRequestStatus.APPROVED
              and request.startDate <= :date and request.endDate >= :date
            order by request.startDate, request.leaveRequestId
            """)
    Optional<LeaveRequest> findCurrentApproved(Integer workerId, LocalDate date);

    Page<LeaveRequest> findByStatus(LeaveRequestStatus status, Pageable pageable);

    Page<LeaveRequest> findByWorkerUserId(Integer workerId, Pageable pageable);

    Page<LeaveRequest> findByWorkerUserIdAndStatus(Integer workerId, LeaveRequestStatus status, Pageable pageable);
}
