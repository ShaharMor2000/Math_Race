package com.mathrace.dto.race;

import com.mathrace.model.enums.RaceRoomStatus;

public record CreateRaceResponse(
    Long roomId,
    String roomCode,
    RaceRoomStatus status
) {
}
