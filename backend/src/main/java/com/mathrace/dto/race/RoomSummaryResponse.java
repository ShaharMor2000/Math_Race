package com.mathrace.dto.race;

import com.mathrace.model.enums.RaceRoomStatus;

import java.time.LocalDateTime;

public record RoomSummaryResponse(
    Long roomId,
    String roomCode,
    String title,
    RaceRoomStatus status,
    long participants,
    long pendingParticipants,
    long approvedParticipants,
    LocalDateTime createdAt
) {
}
