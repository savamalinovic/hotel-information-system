package org.unibl.etf.blueStars.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.unibl.etf.blueStars.models.entities.AppError;

public interface AppErrorRepository extends JpaRepository<AppError, Long> {
}
