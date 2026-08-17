package com.mathrace.controller;

import com.mathrace.dto.race.AddStudentRequest;
import com.mathrace.dto.race.CreateRaceRequest;
import com.mathrace.dto.race.CreateRaceResponse;
import com.mathrace.dto.race.FinalResultsResponse;
import com.mathrace.dto.race.LeaderboardEntry;
import com.mathrace.dto.race.RoomDetailsResponse;
import com.mathrace.dto.race.RoomSummaryResponse;
import com.mathrace.entity.RaceParticipant;
import com.mathrace.entity.RaceRoom;
import com.mathrace.security.AuthPrincipal;
import com.mathrace.security.AuthSupport;
import com.mathrace.service.GameEngineService;
import com.mathrace.service.RaceRoomService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
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
        HttpServletRequest request,
        @Valid @RequestBody CreateRaceRequest createRaceRequest
    ) {
        AuthPrincipal principal = AuthSupport.requireTeacher(request);
        return raceRoomService.createRace(principal.teacherId(), createRaceRequest);
    }

    @GetMapping
    public List<RoomSummaryResponse> listRooms(HttpServletRequest request) {
        AuthPrincipal principal = AuthSupport.requireTeacher(request);
        return raceRoomService.listTeacherRooms(principal.teacherId());
    }

    @PutMapping("/{roomCode}")
    public Map<String, Object> updateRace(
        HttpServletRequest request,
        @PathVariable String roomCode,
        @Valid @RequestBody CreateRaceRequest createRaceRequest
    ) {
        AuthPrincipal principal = AuthSupport.requireTeacher(request);
        RaceRoom room = raceRoomService.updateRace(principal.teacherId(), roomCode, createRaceRequest);
        return Map.of(
            "roomId", room.getId(),
            "roomCode", room.getRoomCode(),
            "status", room.getStatus()
        );
    }

    @GetMapping("/{roomCode}")
    public RoomDetailsResponse roomDetails(HttpServletRequest request, @PathVariable String roomCode) {
        AuthPrincipal principal = AuthSupport.requireTeacher(request);
        return raceRoomService.getRoomDetails(principal.teacherId(), roomCode);
    }

    @DeleteMapping("/{roomCode}")
    public Map<String, Object> archiveRace(HttpServletRequest request, @PathVariable String roomCode) {
        AuthPrincipal principal = AuthSupport.requireTeacher(request);
        RaceRoom room = raceRoomService.archiveRace(principal.teacherId(), roomCode);
        return Map.of(
            "roomCode", room.getRoomCode(),
            "status", "ARCHIVED"
        );
    }

    @PostMapping("/{roomCode}/students")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> addStudent(
        HttpServletRequest request,
        @PathVariable String roomCode,
        @Valid @RequestBody AddStudentRequest addStudentRequest
    ) {
        AuthPrincipal principal = AuthSupport.requireTeacher(request);
        RaceParticipant participant = raceRoomService.addStudentByTeacher(roomCode, principal.teacherId(), addStudentRequest);
        String displayName = participant.getStudent() != null ? participant.getStudent().getDisplayName() : "";
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("participantId", participant.getId());
        body.put("displayName", displayName != null ? displayName : "");
        body.put("participantStatus", participant.getParticipantStatus().name());
        return body;
    }

    @PostMapping("/{roomCode}/start")
    public Map<String, Object> startRace(HttpServletRequest request, @PathVariable String roomCode) {
        AuthPrincipal principal = AuthSupport.requireTeacher(request);
        RaceRoom room = raceRoomService.getByRoomCodeOrThrow(roomCode);
        raceRoomService.ensureTeacherOwnsRoom(principal.teacherId(), room);
        RaceRoom startedRoom = gameEngineService.startRace(roomCode);
        return Map.of(
            "roomCode", startedRoom.getRoomCode(),
            "status", startedRoom.getStatus().name(),
            "startedAt", startedRoom.getStartAt(),
            "raceDurationMinutes", startedRoom.getRaceDurationMinutes()
        );
    }

    @PostMapping("/{roomCode}/pause")
    public Map<String, Object> pauseRace(HttpServletRequest request, @PathVariable String roomCode) {
        AuthPrincipal principal = AuthSupport.requireTeacher(request);
        RaceRoom room = raceRoomService.getByRoomCodeOrThrow(roomCode);
        raceRoomService.ensureTeacherOwnsRoom(principal.teacherId(), room);
        gameEngineService.pauseRace(roomCode);
        return Map.of("roomCode", roomCode.toUpperCase(), "status", "PAUSED");
    }

    @PostMapping("/{roomCode}/resume")
    public Map<String, Object> resumeRace(HttpServletRequest request, @PathVariable String roomCode) {
        AuthPrincipal principal = AuthSupport.requireTeacher(request);
        RaceRoom room = raceRoomService.getByRoomCodeOrThrow(roomCode);
        raceRoomService.ensureTeacherOwnsRoom(principal.teacherId(), room);
        gameEngineService.resumeRace(roomCode);
        return Map.of("roomCode", roomCode.toUpperCase(), "status", "RUNNING");
    }

    @PostMapping("/{roomCode}/end")
    public Map<String, Object> endRace(HttpServletRequest request, @PathVariable String roomCode) {
        AuthPrincipal principal = AuthSupport.requireTeacher(request);
        RaceRoom room = raceRoomService.getByRoomCodeOrThrow(roomCode);
        raceRoomService.ensureTeacherOwnsRoom(principal.teacherId(), room);
        gameEngineService.endRace(roomCode);
        return Map.of("roomCode", roomCode.toUpperCase(), "status", "FINISHED");
    }

    @PostMapping("/{roomCode}/participants/{participantId}/approve")
    public Map<String, Object> approveParticipant(
        HttpServletRequest request,
        @PathVariable String roomCode,
        @PathVariable Long participantId
    ) {
        AuthPrincipal principal = AuthSupport.requireTeacher(request);
        RaceParticipant participant = raceRoomService.approveParticipant(roomCode, principal.teacherId(), participantId);
        return Map.of(
            "participantId", participant.getId(),
            "participantStatus", participant.getParticipantStatus().name()
        );
    }

    @PostMapping("/{roomCode}/participants/{participantId}/reject")
    public Map<String, Object> rejectParticipant(
        HttpServletRequest request,
        @PathVariable String roomCode,
        @PathVariable Long participantId
    ) {
        AuthPrincipal principal = AuthSupport.requireTeacher(request);
        raceRoomService.rejectParticipant(roomCode, principal.teacherId(), participantId);
        return Map.of("participantId", participantId, "participantStatus", "REJECTED");
    }

    @DeleteMapping("/{roomCode}/participants/{participantId}")
    public Map<String, Object> removeParticipant(
        HttpServletRequest request,
        @PathVariable String roomCode,
        @PathVariable Long participantId
    ) {
        AuthPrincipal principal = AuthSupport.requireTeacher(request);
        raceRoomService.removeParticipant(roomCode, principal.teacherId(), participantId);
        return Map.of("participantId", participantId, "participantStatus", "REMOVED");
    }

    @GetMapping("/{roomCode}/leaderboard")
    public List<LeaderboardEntry> leaderboard(HttpServletRequest request, @PathVariable String roomCode) {
        AuthPrincipal principal = AuthSupport.requireTeacher(request);
        RaceRoom room = raceRoomService.getByRoomCodeOrThrow(roomCode);
        raceRoomService.ensureTeacherOwnsRoom(principal.teacherId(), room);
        return gameEngineService.getLeaderboard(roomCode);
    }

    @GetMapping("/{roomCode}/results")
    public FinalResultsResponse finalResults(HttpServletRequest request, @PathVariable String roomCode) {
        AuthPrincipal principal = AuthSupport.requireTeacher(request);
        RaceRoom room = raceRoomService.getByRoomCodeOrThrow(roomCode);
        raceRoomService.ensureTeacherOwnsRoom(principal.teacherId(), room);
        return raceRoomService.getFinalResults(roomCode);
    }
}
