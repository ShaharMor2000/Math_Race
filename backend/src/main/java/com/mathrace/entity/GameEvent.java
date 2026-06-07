package com.mathrace.entity;

import com.mathrace.model.enums.EventType;
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

@Getter
@Setter
@Entity
@Table(name = "game_events")
public class GameEvent extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "race_room_id")
    private RaceRoom raceRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "race_participant_id")
    private RaceParticipant raceParticipant;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private EventType eventType;

    @Column(nullable = false, length = 20)
    private String eventScope = "PERSONAL";

    @Column(length = 4000)
    private String payloadJson;

    @Column(nullable = false)
    private int impactPoints = 0;
}
