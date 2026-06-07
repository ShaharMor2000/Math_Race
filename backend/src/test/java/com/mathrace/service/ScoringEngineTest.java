package com.mathrace.service;

import com.mathrace.entity.RaceParticipant;
import com.mathrace.model.enums.DifficultyLevel;
import com.mathrace.model.enums.PathChoice;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ScoringEngineTest {

    private final ScoringEngine scoringEngine = new ScoringEngine();

    @Test
    void correctAnswerUsesHighwayMultiplier() {
        int delta = scoringEngine.calculateCorrectDelta(
            DifficultyLevel.HARD,
            1000,
            15000,
            0,
            PathChoice.HIGHWAY,
            1.0,
            0
        );
        assertTrue(delta > 35);
    }

    @Test
    void wrongAnswerOnHighwayUsesPenalty() {
        assertEquals(-8, scoringEngine.calculateWrongDelta(PathChoice.HIGHWAY));
    }

    @Test
    void balanceMultiplierBoostsTrailingPlayer() {
        RaceParticipant participant = new RaceParticipant();
        participant.setProgressPoints(100);
        double multiplier = scoringEngine.calculateBalanceMultiplier(participant, 400, 300.0);
        assertEquals(1.25, multiplier);
    }
}
