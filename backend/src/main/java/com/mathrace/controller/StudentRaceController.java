package com.mathrace.controller;

import com.mathrace.dto.race.JoinRaceRequest;
import com.mathrace.dto.race.JoinRaceResponse;
import com.mathrace.dto.race.OpenRaceRoomResponse;
import com.mathrace.dto.race.PathChoiceRequest;
import com.mathrace.dto.race.PathChoiceResponse;
import com.mathrace.dto.race.QuestionResponse;
import com.mathrace.dto.race.SubmitAnswerRequest;
import com.mathrace.dto.race.SubmitAnswerResponse;
import com.mathrace.entity.RaceParticipant;
import com.mathrace.entity.RaceRoom;
import com.mathrace.exception.ApiException;
import com.mathrace.security.AuthPrincipal;
import com.mathrace.security.AuthSupport;
import com.mathrace.service.GameEngineService;
import com.mathrace.service.RaceRoomService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/student")
@RequiredArgsConstructor
public class StudentRaceController {

    private final RaceRoomService raceRoomService;
    private final GameEngineService gameEngineService;

    @GetMapping("/races/open")
    public List<OpenRaceRoomResponse> listOpenRaces() {
        return raceRoomService.listOpenRaces();
    }

    @PostMapping("/join")
    public JoinRaceResponse join(@Valid @RequestBody JoinRaceRequest request) {
        return raceRoomService.joinRace(request);
    }

    @GetMapping("/races/{roomCode}/question")
    public QuestionResponse nextQuestion(HttpServletRequest request, @PathVariable String roomCode) {
        AuthPrincipal principal = AuthSupport.requireStudent(request);
        ensureStudentInRoom(principal, roomCode);
        return gameEngineService.nextQuestion(roomCode, principal.participantId());
    }

    @PostMapping("/races/{roomCode}/answer")
    public SubmitAnswerResponse submitAnswer(
        HttpServletRequest request,
        @PathVariable String roomCode,
        @Valid @RequestBody SubmitAnswerRequest submitAnswerRequest
    ) {
        AuthPrincipal principal = AuthSupport.requireStudent(request);
        ensureStudentInRoom(principal, roomCode);
        return gameEngineService.submitAnswer(roomCode, principal.participantId(), submitAnswerRequest);
    }

    @PostMapping("/races/{roomCode}/swap")
    public QuestionResponse swapQuestion(
        HttpServletRequest request,
        @PathVariable String roomCode,
        @RequestParam Long questionId
    ) {
        AuthPrincipal principal = AuthSupport.requireStudent(request);
        ensureStudentInRoom(principal, roomCode);
        return gameEngineService.swapQuestion(roomCode, principal.participantId(), questionId);
    }

    @PostMapping("/races/{roomCode}/path")
    public PathChoiceResponse choosePath(
        HttpServletRequest request,
        @PathVariable String roomCode,
        @Valid @RequestBody PathChoiceRequest pathChoiceRequest
    ) {
        AuthPrincipal principal = AuthSupport.requireStudent(request);
        ensureStudentInRoom(principal, roomCode);
        return gameEngineService.choosePath(roomCode, principal.participantId(), pathChoiceRequest);
    }

    private void ensureStudentInRoom(AuthPrincipal principal, String roomCode) {
        RaceRoom room = raceRoomService.getByRoomCodeOrThrow(roomCode);
        if (principal.roomId() != null && !principal.roomId().equals(room.getId())) {
            throw new ApiException("FORBIDDEN", "Student token does not match room");
        }
        RaceParticipant participant = raceRoomService.getRoomParticipants(roomCode).stream()
            .filter(p -> p.getId().equals(principal.participantId()))
            .findFirst()
            .orElseThrow(() -> new ApiException("PARTICIPANT_NOT_IN_ROOM", "Participant not in room"));
        if (!participant.getRaceRoom().getId().equals(room.getId())) {
            throw new ApiException("PARTICIPANT_NOT_IN_ROOM", "Participant not in room");
        }
    }
}
