package com.mathrace.controller;

import com.mathrace.dto.race.FinalResultsResponse;
import com.mathrace.service.RaceRoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/races")
@RequiredArgsConstructor
public class PublicRaceController {

    private final RaceRoomService raceRoomService;

    @GetMapping("/{roomCode}/results")
    public FinalResultsResponse getResults(@PathVariable String roomCode) {
        return raceRoomService.getFinalResults(roomCode);
    }
}
