package com.mathrace.dto.race;

import com.mathrace.model.enums.ParticipantStatus;
import com.mathrace.model.enums.RaceRoomStatus;

import java.time.LocalDateTime;

public record StudentRaceSummaryResponse(
    String roomCode,
    String title,
    String className,
    RaceRoomStatus raceStatus,
    ParticipantStatus participantStatus,
    int progressPoints,
    int scoreTotal,
    int correctCount,
    int wrongCount,
    Integer avgResponseMs,
    LocalDateTime joinedAt,
    LocalDateTime raceStartedAt,
    LocalDateTime raceFinishedAt
) {
}
