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

    private final Map<String, List<Subscriber>> subscribersByRoom = new ConcurrentHashMap<>();

    public SseEmitter subscribe(String roomCode, String role, Long participantId) {
        SseEmitter emitter = new SseEmitter(0L);
        Subscriber subscriber = new Subscriber(emitter, role, participantId);
        subscribersByRoom.computeIfAbsent(roomCode, k -> new CopyOnWriteArrayList<>()).add(subscriber);

        emitter.onCompletion(() -> removeSubscriber(roomCode, subscriber));
        emitter.onTimeout(() -> removeSubscriber(roomCode, subscriber));
        emitter.onError(ex -> removeSubscriber(roomCode, subscriber));

        send(emitter, "heartbeat", new StreamEventDto(roomCode, "heartbeat", LocalDateTime.now(), Map.of("status", "connected")));
        return emitter;
    }

    public void publish(String roomCode, String eventType, Map<String, Object> payload) {
        publish(roomCode, eventType, payload, null);
    }

    public void publish(String roomCode, String eventType, Map<String, Object> payload, Long targetParticipantId) {
        StreamEventDto dto = new StreamEventDto(roomCode, eventType, LocalDateTime.now(), payload);
        List<Subscriber> subscribers = subscribersByRoom.getOrDefault(roomCode, List.of());
        for (Subscriber subscriber : subscribers) {
            if (!shouldDeliver(subscriber, eventType, payload, targetParticipantId)) {
                continue;
            }
            send(subscriber.emitter(), eventType, dto);
        }
    }

    private boolean shouldDeliver(
        Subscriber subscriber,
        String eventType,
        Map<String, Object> payload,
        Long targetParticipantId
    ) {
        if (targetParticipantId != null) {
            Object payloadParticipantId = payload.get("participantId");
            if (payloadParticipantId != null && !targetParticipantId.equals(toLong(payloadParticipantId))) {
                return false;
            }
        }

        if ("TEACHER".equalsIgnoreCase(subscriber.role())) {
            return true;
        }

        if ("STUDENT".equalsIgnoreCase(subscriber.role())) {
            return switch (eventType) {
                case "question_ready", "registration_approved", "registration_rejected" -> {
                    Object payloadParticipantId = payload.get("participantId");
                    yield payloadParticipantId == null || subscriber.participantId() == null
                        || subscriber.participantId().equals(toLong(payloadParticipantId));
                }
                case "game_event", "bonus", "position_update" -> {
                    Object payloadParticipantId = payload.get("participantId");
                    yield payloadParticipantId == null || subscriber.participantId() == null
                        || subscriber.participantId().equals(toLong(payloadParticipantId));
                }
                case "registration_requested" -> false;
                default -> true;
            };
        }

        return true;
    }

    private void send(SseEmitter emitter, String eventType, StreamEventDto dto) {
        try {
            emitter.send(SseEmitter.event().name(eventType).data(dto));
        } catch (IOException | IllegalStateException e) {
            emitter.completeWithError(e);
        }
    }

    private void removeSubscriber(String roomCode, Subscriber subscriber) {
        subscribersByRoom.getOrDefault(roomCode, List.of()).remove(subscriber);
    }

    private Long toLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(value.toString());
    }

    private record Subscriber(SseEmitter emitter, String role, Long participantId) {}
}
