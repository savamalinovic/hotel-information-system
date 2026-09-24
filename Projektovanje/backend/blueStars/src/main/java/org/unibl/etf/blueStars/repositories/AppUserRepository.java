package org.unibl.etf.blueStars.repositories;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.unibl.etf.blueStars.models.entities.AppUser;
import org.unibl.etf.blueStars.models.enums.UserRole;

import java.util.Collection;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

@Repository
public interface AppUserRepository extends JpaRepository<AppUser, Integer>, JpaSpecificationExecutor<AppUser> {
    Optional<AppUser> findByEmail(String email);
    Optional<AppUser> findByEmailIgnoreCase(String email);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select user from AppUser user where lower(user.email) = lower(:email)")
    Optional<AppUser> findByEmailIgnoreCaseForUpdate(String email);
    boolean existsByEmail(String email);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCaseAndUserIdNot(String email, Integer userId);
    boolean existsByJmbg(String jmbg);
    boolean existsByJmbgAndUserIdNot(String jmbg, Integer userId);
    boolean existsByPhoneNumber(String phoneNumber);
    boolean existsByPhoneNumberAndUserIdNot(String phoneNumber, Integer userId);
    boolean existsByRoleAndActiveTrue(UserRole role);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select user from AppUser user where user.role = :role and user.active = true order by user.userId")
    List<AppUser> findActiveByRoleForUpdate(UserRole role);
    Page<AppUser> findByRoleAndActiveTrue(UserRole role, Pageable pageable);

    Page<AppUser> findByRoleInAndActiveTrue(Collection<UserRole> roles, Pageable pageable);
    List<AppUser> findAllByRoleAndActiveTrue(UserRole role);

    @Query("""
            select distinct user
            from AppUser user join user.specializations specialization
            where user.active = true
              and user.role = :role
              and specialization.specializationId = :specializationId
            order by user.userId
            """)
    List<AppUser> findActiveByRoleAndSpecializationId(
            @Param("role") UserRole role,
            @Param("specializationId") Short specializationId);

    //Optional<AppUser> findByUserId(int userId);
}
