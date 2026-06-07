package com.mathrace.service;

import com.mathrace.entity.GameEvent;
import com.mathrace.entity.RaceParticipant;
import com.mathrace.entity.RaceRoom;
import com.mathrace.model.enums.EventType;
import com.mathrace.repository.GameEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class LuckEventEngine {

    private final GameEventRepository gameEventRepository;
    private final Random random = new Random();

    public LuckOutcome maybeTrigger(RaceRoom room, RaceParticipant participant) {
        if (!room.isEnableLuckEvents()) {
            return LuckOutcome.none();
        }
        int roll = random.nextInt(100);
        if (roll > 25) {
            return LuckOutcome.none();
        }

        EventType eventType;
        int impact;
        String message;
        int effectQuestions = 0;
        if (roll < 8) {
            eventType = EventType.TURBO;
            impact = 40;
            message = "טורבו! +40 התקדמות";
        } else if (roll < 14) {
            eventType = EventType.BOOST;
            impact = 20;
            message = "בוסט! +20 התקדמות";
        } else if (roll < 18) {
            eventType = EventType.HINT;
            impact = 0;
            message = "רמז — פחות אפשרויות תשובה";
            effectQuestions = 1;
        } else if (roll < 21) {
            eventType = EventType.SWAP_QUESTION;
            impact = 0;
            message = "אפשרות להחלפת שאלה";
            effectQuestions = 1;
        } else if (roll < 23) {
            eventType = EventType.MALFUNCTION;
            impact = -15;
            message = "תקלה ברכב! -15";
        } else {
            eventType = EventType.SLOWDOWN;
            impact = 0;
            message = "האטה — מהירות מופחתת לשתי שאלות";
            effectQuestions = 2;
        }

        GameEvent event = new GameEvent();
        event.setRaceRoom(room);
        event.setRaceParticipant(participant);
        event.setEventType(eventType);
        event.setImpactPoints(impact);
        event.setPayloadJson(toJson(Map.of("message", message)));
        gameEventRepository.save(event);
        return new LuckOutcome(eventType, impact, message, effectQuestions);
    }

    private String toJson(Map<String, Object> map) {
        return map.toString();
    }

    public record LuckOutcome(EventType type, int impactPoints, String message, int effectQuestions) {
        public static LuckOutcome none() {
            return new LuckOutcome(null, 0, null, 0);
        }

        public boolean exists() {
            return type != null;
        }
    }
}
