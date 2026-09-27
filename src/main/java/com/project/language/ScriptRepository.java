package com.project.language;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/**
 * Data access for {@link Script} entities.
 */
public interface ScriptRepository extends JpaRepository<Script, UUID> {

    Optional<Script> findByCode(String code);

    boolean existsByCode(String code);
}