package com.mathrace.entity;

import com.mathrace.model.enums.ParticipantStatus;
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
@Table(name = "race_participants")
public class RaceParticipant extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "race_room_id")
    private RaceRoom raceRoom;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id")
    private Student student;

    @Column(nullable = false)
    private int laneNo;

    @Column(nullable = false, length = 30)
    private String carColor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ParticipantStatus participantStatus = ParticipantStatus.ACTIVE;

    @Column(nullable = false)
    private int progressPoints = 0;

    @Column(nullable = false)
    private int scoreTotal = 0;

    @Column(nullable = false)
    private int streakCount = 0;

    @Column(nullable = false)
    private int correctCount = 0;

    @Column(nullable = false)
    private int wrongCount = 0;

    private Integer avgResponseMs;
    private LocalDateTime lastAnswerAt;

    @Column(columnDefinition = "TEXT")
    private String runtimeStateJson;
}
