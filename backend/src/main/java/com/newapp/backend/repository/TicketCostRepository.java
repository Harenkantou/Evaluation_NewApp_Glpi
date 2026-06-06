package com.newapp.backend.repository;

import com.newapp.backend.entity.TicketCost;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketCostRepository extends JpaRepository<TicketCost, Long> {
}
