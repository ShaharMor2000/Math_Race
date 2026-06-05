package com.mathrace.controller;

import com.mathrace.dto.race.JoinRaceRequest;
import com.mathrace.dto.race.JoinRaceResponse;
import com.mathrace.dto.race.OpenRaceRoomResponse;
import com.mathrace.dto.race.PathChoiceRequest;
import com.mathrace.dto.race.PathChoiceResponse;
import com.mathrace.dto.race.QuestionResponse;
import com.mathrace.dto.race.SubmitAnswerRequest;
import com.mathrace.dto.race.SubmitAnswerResponse;
import com.mathrace.service.GameEngineService;
import com.mathrace.service.RaceRoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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
    public QuestionResponse nextQuestion(
        @PathVariable String roomCode,
        @RequestHeader("X-Participant-Id") Long participantId
    ) {
        return gameEngineService.nextQuestion(roomCode, participantId);
    }

    @PostMapping("/races/{roomCode}/answer")
    public SubmitAnswerResponse submitAnswer(
        @PathVariable String roomCode,
        @RequestHeader("X-Participant-Id") Long participantId,
        @Valid @RequestBody SubmitAnswerRequest request
    ) {
        return gameEngineService.submitAnswer(roomCode, participantId, request);
    }

    @PostMapping("/races/{roomCode}/path")
    public PathChoiceResponse choosePath(
        @PathVariable String roomCode,
        @RequestHeader("X-Participant-Id") Long participantId,
        @Valid @RequestBody PathChoiceRequest request
    ) {
        return gameEngineService.choosePath(roomCode, participantId, request);
    }
}
