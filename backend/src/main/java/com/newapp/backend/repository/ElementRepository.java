package com.newapp.backend.repository;

import com.newapp.backend.entity.Element;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ElementRepository extends JpaRepository<Element, Long> {
    Optional<Element> findByName(String name);
}
