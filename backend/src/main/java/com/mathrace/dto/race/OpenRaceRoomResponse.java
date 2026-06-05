package com.mathrace.dto.race;

public record OpenRaceRoomResponse(
    String roomCode,
    String title,
    String className,
    long registeredCount,
    int maxParticipants
) {
}
