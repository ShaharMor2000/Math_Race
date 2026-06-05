package com.mathrace.entity;

import com.mathrace.model.enums.DifficultyLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "question_templates")
public class QuestionTemplate extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 80)
    private String templateCode;

    @Column(nullable = false, length = 60)
    private String topic;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DifficultyLevel difficulty;

    @Column(nullable = false, length = 255)
    private String expressionPattern;

    @Column(nullable = false)
    private int minOperand;

    @Column(nullable = false)
    private int maxOperand;

    @Column(nullable = false)
    private boolean allowNegative = false;

    @Column(nullable = false)
    private int estimatedTimeMs = 15000;

    @Column(nullable = false)
    private boolean isActive = true;
}
