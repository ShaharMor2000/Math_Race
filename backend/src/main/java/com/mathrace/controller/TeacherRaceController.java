package com.mathrace.controller;

import com.mathrace.dto.race.CreateRaceRequest;
import com.mathrace.dto.race.CreateRaceResponse;
import com.mathrace.dto.race.FinalResultsResponse;
import com.mathrace.dto.race.LeaderboardEntry;
import com.mathrace.dto.race.RoomSummaryResponse;
import com.mathrace.entity.RaceParticipant;
import com.mathrace.entity.RaceRoom;
import com.mathrace.service.GameEngineService;
import com.mathrace.service.RaceRoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/teacher/races")
@RequiredArgsConstructor
public class TeacherRaceController {

    private final RaceRoomService raceRoomService;
    private final GameEngineService gameEngineService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CreateRaceResponse createRace(
        @RequestHeader("X-Teacher-Id") Long teacherId,
        @Valid @RequestBody CreateRaceRequest request
    ) {
        return raceRoomService.createRace(teacherId, request);
    }

    @GetMapping
    public List<RoomSummaryResponse> listRooms(@RequestHeader("X-Teacher-Id") Long teacherId) {
        return raceRoomService.listTeacherRooms(teacherId);
    }

    @GetMapping("/{roomCode}")
    public Map<String, Object> roomDetails(@PathVariable String roomCode) {
        RaceRoom room = raceRoomService.getByRoomCodeOrThrow(roomCode);
        List<RaceParticipant> participants = raceRoomService.getRoomParticipants(roomCode);
        List<Map<String, Object>> rows = participants.stream().map(p -> Map.of(
            "participantId", p.getId(),
            "studentId", p.getStudent().getId(),
            "displayName", p.getStudent().getDisplayName(),
            "laneNo", p.getLaneNo(),
            "carColor", p.getCarColor(),
            "participantStatus", p.getParticipantStatus().name(),
            "progressPoints", p.getProgressPoints(),
            "scoreTotal", p.getScoreTotal()
        )).toList();
        return Map.of(
            "roomId", room.getId(),
            "roomCode", room.getRoomCode(),
            "status", room.getStatus(),
            "participants", rows
        );
    }

    @PostMapping("/{roomCode}/start")
    public Map<String, Object> startRace(@PathVariable String roomCode) {
        gameEngineService.startRace(roomCode);
        return Map.of("roomCode", roomCode.toUpperCase(), "status", "RUNNING", "startedAt", LocalDateTime.now());
    }

    @PostMapping("/{roomCode}/end")
    public Map<String, Object> endRace(@PathVariable String roomCode) {
        gameEngineService.endRace(roomCode);
        return Map.of("roomCode", roomCode.toUpperCase(), "status", "FINISHED");
    }

    @PostMapping("/{roomCode}/participants/{participantId}/approve")
    public Map<String, Object> approveParticipant(
        @PathVariable String roomCode,
        @PathVariable Long participantId
    ) {
        RaceParticipant participant = raceRoomService.approveParticipant(roomCode, participantId);
        return Map.of(
            "participantId", participant.getId(),
            "participantStatus", participant.getParticipantStatus().name()
        );
    }

    @PostMapping("/{roomCode}/participants/{participantId}/reject")
    public Map<String, Object> rejectParticipant(
        @PathVariable String roomCode,
        @PathVariable Long participantId
    ) {
        raceRoomService.rejectParticipant(roomCode, participantId);
        return Map.of("participantId", participantId, "participantStatus", "REJECTED");
    }

    @GetMapping("/{roomCode}/leaderboard")
    public List<LeaderboardEntry> leaderboard(@PathVariable String roomCode) {
        return gameEngineService.getLeaderboard(roomCode);
    }

    @GetMapping("/{roomCode}/results")
    public FinalResultsResponse finalResults(@PathVariable String roomCode) {
        return raceRoomService.getFinalResults(roomCode);
    }
}
