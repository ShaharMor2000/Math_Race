package com.mathrace.controller;

import com.mathrace.service.SseEventPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/v1/stream")
@RequiredArgsConstructor
public class StreamController {

    private final SseEventPublisher sseEventPublisher;

    @GetMapping("/rooms/{roomCode}")
    public SseEmitter subscribe(@PathVariable String roomCode) {
        return sseEventPublisher.subscribe(roomCode.toUpperCase());
    }
}
