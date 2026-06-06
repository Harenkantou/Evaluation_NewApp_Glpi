package com.newapp.backend.repository;

import com.newapp.backend.entity.ElementType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ElementTypeRepository extends JpaRepository<ElementType, Long> {
    Optional<ElementType> findByName(String name);
}