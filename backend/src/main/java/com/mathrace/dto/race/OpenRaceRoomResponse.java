package com.mathrace.dto.race;

import com.mathrace.model.enums.RaceRoomStatus;

public record OpenRaceRoomResponse(
    String roomCode,
    String title,
    String className,
    long registeredCount,
    int maxParticipants,
    RaceRoomStatus status
) {
}
