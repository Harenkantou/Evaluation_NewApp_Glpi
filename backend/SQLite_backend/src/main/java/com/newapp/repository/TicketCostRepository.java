package com.newapp.repository;

import com.newapp.entity.TicketCost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TicketCostRepository extends JpaRepository<TicketCost, Long> {
    List<TicketCost> findByTicketId(Integer ticketId);
}