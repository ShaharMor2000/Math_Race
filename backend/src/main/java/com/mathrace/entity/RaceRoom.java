package com.mathrace.entity;

import com.mathrace.model.enums.DifficultyLevel;
import com.mathrace.model.enums.RaceRoomStatus;
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
@Table(name = "race_rooms")
public class RaceRoom extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "teacher_id")
    private Teacher teacher;

    @Column(nullable = false, unique = true, length = 12)
    private String roomCode;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(length = 120)
    private String className;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RaceRoomStatus status = RaceRoomStatus.LOBBY;

    @Column(nullable = false)
    private int maxParticipants = 8;

    @Column(nullable = false)
    private int questionTimeMs = 15000;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DifficultyLevel initialDifficulty = DifficultyLevel.MEDIUM;

    @Column(nullable = false)
    private boolean enableLuckEvents = true;

    @Column(nullable = false)
    private boolean enablePathChoice = true;

    private LocalDateTime startAt;
    private LocalDateTime finishAt;
    private LocalDateTime archivedAt;
    private Long winnerParticipantId;

    @Column(nullable = false)
    private int raceDurationMinutes = 45;
}
