package org.unibl.etf.efikas.repositories;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.unibl.etf.efikas.models.entities.AppUser;
import org.unibl.etf.efikas.models.enums.UserRole;

import java.util.Optional;
import java.util.List;

@Repository
public interface AppUserRepository extends JpaRepository<AppUser, Integer>, JpaSpecificationExecutor<AppUser> {
    Optional<AppUser> findByEmail(String email);
    Optional<AppUser> findByEmailIgnoreCase(String email);
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

    //Optional<AppUser> findByUserId(int userId);
}
