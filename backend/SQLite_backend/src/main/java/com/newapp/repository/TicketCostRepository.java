// src/main/java/com/newapp/repository/TicketCostRepository.java
package com.newapp.repository;

import com.newapp.entity.TicketCost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TicketCostRepository extends JpaRepository<TicketCost, Long> {
    
    // Trouver par ticket
    List<TicketCost> findByTicketId(Integer ticketId);

    // ✅ Correction : "And" avec un A majuscule
    List<TicketCost> findByItemTypeAndItemId(String itemType, Integer itemId);

    // Trouver par batch d'import
    List<TicketCost> findByBatchId(String batchId);

    // Trouver par type de coût
    List<TicketCost> findByCostType(String costType);
    
    // ✨ Bonus : combinaisons utiles
    List<TicketCost> findByItemType(String itemType);
    
    List<TicketCost> findByTicketIdAndCostType(Integer ticketId, String costType);
}