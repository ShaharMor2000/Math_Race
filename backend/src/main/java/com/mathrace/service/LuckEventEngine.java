package com.mathrace.service;

import com.mathrace.entity.GameEvent;
import com.mathrace.entity.RaceParticipant;
import com.mathrace.entity.RaceRoom;
import com.mathrace.model.enums.EventType;
import com.mathrace.model.runtime.RuntimeParticipantState;
import com.mathrace.repository.GameEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class LuckEventEngine {

    private static final int BASE_TRIGGER_PERCENT = 12;
    private static final int LUCK_METER_TRIGGER_COST = 45;

    private final GameEventRepository gameEventRepository;
    private final Random random = new Random();

    public LuckOutcome maybeTrigger(
        RaceRoom room,
        RaceParticipant participant,
        RuntimeParticipantState state,
        int leaderProgress,
        double avgProgress
    ) {
        if (!room.isEnableLuckEvents()) {
            return LuckOutcome.none();
        }

        int gapFromLeader = leaderProgress - participant.getProgressPoints();
        int gapFromAvg = (int) Math.round(avgProgress - participant.getProgressPoints());
        boolean isTrailing = gapFromLeader > 150 || gapFromAvg > 150;
        boolean isLeading = gapFromLeader < -120;

        int luckMeterBonus = Math.min(28, state.getLuckMeter() / 4);
        int trailingBonus = isTrailing ? 14 : 0;
        int leaderPenalty = isLeading ? -10 : 0;
        int negativeStreakBonus = Math.min(12, state.getNegativeLuckStreak() * 4);

        int triggerChance = BASE_TRIGGER_PERCENT + luckMeterBonus + trailingBonus + leaderPenalty + negativeStreakBonus;
        triggerChance = Math.max(5, Math.min(42, triggerChance));

        if (random.nextInt(100) >= triggerChance) {
            state.setLuckMeter(Math.min(100, state.getLuckMeter() + (isTrailing ? 10 : 6)));
            return LuckOutcome.none();
        }

        state.setLuckMeter(Math.max(0, state.getLuckMeter() - LUCK_METER_TRIGGER_COST));
        return createOutcome(room, participant, state, isTrailing, isLeading);
    }

    private LuckOutcome createOutcome(
        RaceRoom room,
        RaceParticipant participant,
        RuntimeParticipantState state,
        boolean isTrailing,
        boolean isLeading
    ) {
        int roll = random.nextInt(100);
        EventType eventType;
        int impact;
        String message;
        int effectQuestions = 0;

        if (isTrailing && roll < 35) {
            eventType = roll < 18 ? EventType.HINT : EventType.SWAP_QUESTION;
            impact = 0;
            message = eventType == EventType.HINT ? "רמז מיוחד למתחרים מאחור!" : "החלפת שאלה — הזדמנות להתקדם!";
            effectQuestions = 1;
        } else if (roll < 30) {
            eventType = EventType.TURBO;
            impact = isLeading ? 25 : 40;
            message = "טורבו! +" + impact + " התקדמות";
        } else if (roll < 50) {
            eventType = EventType.BOOST;
            impact = isLeading ? 12 : 20;
            message = "בוסט! +" + impact + " התקדמות";
        } else if (roll < 62) {
            eventType = EventType.HINT;
            impact = 0;
            message = "רמז — פחות אפשרויות תשובה";
            effectQuestions = 1;
        } else if (roll < 72) {
            eventType = EventType.SWAP_QUESTION;
            impact = 0;
            message = "אפשרות להחלפת שאלה";
            effectQuestions = 1;
        } else if (roll < 84) {
            eventType = EventType.MALFUNCTION;
            impact = isLeading ? -20 : -15;
            message = "תקלה ברכב! " + impact;
            state.setNegativeLuckStreak(state.getNegativeLuckStreak() + 1);
            state.setLuckMeter(Math.min(100, state.getLuckMeter() + 18));
        } else {
            eventType = EventType.SLOWDOWN;
            impact = 0;
            message = "האטה — מהירות מופחתת לשתי שאלות";
            effectQuestions = 2;
            state.setNegativeLuckStreak(state.getNegativeLuckStreak() + 1);
            state.setLuckMeter(Math.min(100, state.getLuckMeter() + 14));
        }

        if (eventType != EventType.MALFUNCTION && eventType != EventType.SLOWDOWN) {
            state.setNegativeLuckStreak(0);
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
