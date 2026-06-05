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
@Table(name = "race_results")
public class RaceResult extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "race_room_id")
    private RaceRoom raceRoom;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "race_participant_id")
    private RaceParticipant raceParticipant;

    @Column(nullable = false)
    private int finalRank;

    @Column(nullable = false)
    private int finalProgress;

    @Column(nullable = false)
    private int finalScore;

    @Column(nullable = false, precision = 5, scale = 2)
    private double accuracyPct;

    private Integer avgResponseMs;

    @Column(nullable = false)
    private int totalCorrect;

    @Column(nullable = false)
    private int totalWrong;

    @Column(nullable = false)
    private int totalEvents;

    @Column(nullable = false)
    private LocalDateTime finishedAt = LocalDateTime.now();
}
