package com.mathrace.model.runtime;

import com.mathrace.model.enums.RaceRoomStatus;
import lombok.Getter;
import lombok.Setter;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Getter
@Setter
public class GameSession {
    private Long roomId;
    private String roomCode;
    private RaceRoomStatus status;
    private Map<Long, RuntimeParticipantState> participants = new ConcurrentHashMap<>();
}
