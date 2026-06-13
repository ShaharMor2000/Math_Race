package com.mathrace.dto.race;

import com.mathrace.model.enums.DifficultyLevel;
import com.mathrace.model.enums.ParticipantStatus;
import com.mathrace.model.enums.RaceRoomStatus;

import java.time.LocalDateTime;
import java.util.List;

public record RoomDetailsResponse(
    Long roomId,
    String roomCode,
    String title,
    String className,
    RaceRoomStatus status,
    int maxParticipants,
    int questionTimeMs,
    DifficultyLevel initialDifficulty,
    boolean enableLuckEvents,
    boolean enablePathChoice,
    LocalDateTime startAt,
    int raceDurationMinutes,
    List<ParticipantRow> participants
) {
    public record ParticipantRow(
        Long participantId,
        Long studentId,
        String displayName,
        String email,
        int laneNo,
        String carColor,
        ParticipantStatus participantStatus,
        int progressPoints,
        int scoreTotal
    ) {}
}
