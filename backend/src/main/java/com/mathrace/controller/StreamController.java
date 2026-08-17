package com.mathrace.controller;

import com.mathrace.entity.RaceParticipant;
import com.mathrace.entity.RaceRoom;
import com.mathrace.service.RaceRoomService;
import com.mathrace.service.SseEventPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/stream")
@RequiredArgsConstructor
public class StreamController {

    private final SseEventPublisher sseEventPublisher;
    private final RaceRoomService raceRoomService;

    @GetMapping("/rooms/{roomCode}")
    public SseEmitter subscribe(
        @PathVariable String roomCode,
        @RequestParam(required = false) String role,
        @RequestParam(required = false) Long participantId
    ) {
        String normalizedRoomCode = roomCode.toUpperCase();
        SseEmitter emitter = sseEventPublisher.subscribe(normalizedRoomCode, role, participantId);
        sseEventPublisher.sendTo(emitter, normalizedRoomCode, "room_state", buildRoomState(normalizedRoomCode, participantId));
        return emitter;
    }

    private Map<String, Object> buildRoomState(String roomCode, Long participantId) {
        RaceRoom room = raceRoomService.getByRoomCodeOrThrow(roomCode);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("status", room.getStatus().name());
        payload.put("startAt", room.getStartAt());
        payload.put("raceDurationMinutes", room.getRaceDurationMinutes());

        if (participantId != null) {
            raceRoomService.getRoomParticipants(roomCode).stream()
                .filter(participant -> participant.getId().equals(participantId))
                .findFirst()
                .ifPresent(participant -> addParticipantState(payload, participant));
        }
        return payload;
    }

    private void addParticipantState(Map<String, Object> payload, RaceParticipant participant) {
        payload.put("participantId", participant.getId());
        payload.put("participantStatus", participant.getParticipantStatus().name());
        payload.put("progress", participant.getProgressPoints());
        payload.put("score", participant.getScoreTotal());
    }
}
