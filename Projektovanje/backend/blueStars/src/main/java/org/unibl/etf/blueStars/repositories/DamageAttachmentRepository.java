package org.unibl.etf.blueStars.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.unibl.etf.blueStars.models.entities.DamageAttachment;

import java.util.List;

public interface DamageAttachmentRepository extends JpaRepository<DamageAttachment, Long> {
    List<DamageAttachment> findByDamageDamageIdOrderByUploadedAtAscDamageAttachmentIdAsc(Long damageId);
}
