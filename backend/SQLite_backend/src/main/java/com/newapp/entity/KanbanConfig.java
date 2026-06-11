package com.newapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "kanban_config")
public class KanbanConfig {

    @Id
    @Column(name = "status_id")
    private Integer statusId;

    private String color;

    @Column(name = "label_mg")
    private String labelMg;

    @Column(name = "label_fr")
    private String labelFr;
}