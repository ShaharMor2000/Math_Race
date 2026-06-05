package com.mathrace.service;

import com.mathrace.dto.stream.StreamEventDto;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class SseEventPublisher {

    private final Map<String, List<SseEmitter>> emittersByRoom = new ConcurrentHashMap<>();

    public SseEmitter subscribe(String roomCode) {
        SseEmitter emitter = new SseEmitter(0L);
        emittersByRoom.computeIfAbsent(roomCode, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(roomCode, emitter));
        emitter.onTimeout(() -> removeEmitter(roomCode, emitter));
        emitter.onError(ex -> removeEmitter(roomCode, emitter));

        send(emitter, "heartbeat", new StreamEventDto(roomCode, "heartbeat", LocalDateTime.now(), Map.of("status", "connected")));
        return emitter;
    }

    public void publish(String roomCode, String eventType, Map<String, Object> payload) {
        StreamEventDto dto = new StreamEventDto(roomCode, eventType, LocalDateTime.now(), payload);
        List<SseEmitter> emitters = emittersByRoom.getOrDefault(roomCode, List.of());
        for (SseEmitter emitter : emitters) {
            send(emitter, eventType, dto);
        }
    }

    private void send(SseEmitter emitter, String eventType, StreamEventDto dto) {
        try {
            emitter.send(SseEmitter.event().name(eventType).data(dto));
        } catch (IOException e) {
            emitter.completeWithError(e);
        }
    }

    private void removeEmitter(String roomCode, SseEmitter emitter) {
        emittersByRoom.getOrDefault(roomCode, List.of()).remove(emitter);
    }
}
