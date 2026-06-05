package com.mathrace.dto.race;

import com.mathrace.model.enums.ParticipantStatus;
import com.mathrace.model.enums.RaceRoomStatus;

public record JoinRaceResponse(
    String studentToken,
    StudentData student,
    ParticipantData participant,
    RoomData room
) {
    public record StudentData(Long studentId, String displayName) {}
    public record ParticipantData(Long participantId, int laneNo, String carColor, ParticipantStatus participantStatus) {}
    public record RoomData(String roomCode, RaceRoomStatus status) {}
}
