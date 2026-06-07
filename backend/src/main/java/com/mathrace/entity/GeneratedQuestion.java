package com.mathrace.entity;

import com.mathrace.model.enums.DifficultyLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "generated_questions")
public class GeneratedQuestion extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "race_room_id")
    private RaceRoom raceRoom;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "race_participant_id")
    private RaceParticipant raceParticipant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    private QuestionTemplate template;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DifficultyLevel difficulty;

    @Column(nullable = false, length = 255)
    private String questionText;

    @Column(nullable = false, length = 80)
    private String correctAnswer;

    @Column(length = 4000)
    private String optionsJson;

    private Long seedValue;

    @Column(nullable = false)
    private int maxTimeMs;

    @Column(nullable = false)
    private LocalDateTime presentedAt = LocalDateTime.now();

    private LocalDateTime expiredAt;

    @Column(nullable = false)
    private boolean isAnswered = false;
}
