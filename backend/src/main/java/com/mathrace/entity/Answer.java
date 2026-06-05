package com.mathrace.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "answers")
public class Answer extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "race_room_id")
    private RaceRoom raceRoom;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "race_participant_id")
    private RaceParticipant raceParticipant;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id")
    private GeneratedQuestion question;

    @Column(nullable = false, length = 80)
    private String submittedAnswer;

    @Column(nullable = false)
    private boolean isCorrect;

    @Column(nullable = false)
    private int responseTimeMs;

    @Column(nullable = false)
    private int basePoints;

    @Column(nullable = false)
    private int bonusPoints;

    @Column(nullable = false)
    private int penaltyPoints;

    @Column(nullable = false)
    private int finalDeltaPoints;

    @Column(nullable = false)
    private LocalDateTime submittedAt = LocalDateTime.now();
}
