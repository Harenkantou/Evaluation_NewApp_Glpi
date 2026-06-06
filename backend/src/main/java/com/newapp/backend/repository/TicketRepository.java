package com.newapp.backend.repository;

import com.newapp.backend.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TicketRepository extends JpaRepository<Ticket, Long> {
    Optional<Ticket> findByRefTicket(Integer refTicket);
}
