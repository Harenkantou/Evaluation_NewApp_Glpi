package com.newapp.repository;

import com.newapp.entity.KanbanConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface KanbanConfigRepository extends JpaRepository<KanbanConfig, Integer> {

}