package com.mathrace.service;

import com.mathrace.entity.RaceParticipant;
import com.mathrace.model.enums.DifficultyLevel;
import com.mathrace.model.enums.PathChoice;
import org.springframework.stereotype.Service;

@Service
public class ScoringEngine {

    public int calculateCorrectDelta(
        DifficultyLevel difficulty,
        int responseTimeMs,
        int maxTimeMs,
        int streakCount,
        PathChoice pathChoice,
        double balanceMultiplier,
        int luckModifier
    ) {
        int basePoints = switch (difficulty) {
            case EASY -> 10;
            case MEDIUM -> 20;
            case HARD -> 35;
        };
        double speedFactor = clamp(0.5, 1.5, 1.5 - ((double) responseTimeMs / Math.max(1, maxTimeMs)));
        int streakBonus = streakCount > 0 && streakCount % 5 == 0 ? 15 : (streakCount > 0 && streakCount % 3 == 0 ? 8 : 0);
        double pathMultiplier = pathChoice == PathChoice.HIGHWAY ? 1.8 : (pathChoice == PathChoice.DIRT_ROAD ? 1.1 : 1.0);

        return (int) Math.round((basePoints * speedFactor + streakBonus) * pathMultiplier * balanceMultiplier) + luckModifier;
    }

    public int calculateWrongDelta(PathChoice pathChoice) {
        if (pathChoice == PathChoice.HIGHWAY) {
            return -8;
        }
        if (pathChoice == PathChoice.DIRT_ROAD) {
            return -2;
        }
        return -5;
    }

    public double calculateBalanceMultiplier(RaceParticipant participant, int roomLeaderProgress, double roomAverageProgress) {
        int progress = participant.getProgressPoints();
        int gapFromAvg = (int) Math.round(roomAverageProgress - progress);
        int gapFromLeader = roomLeaderProgress - progress;

        if (gapFromLeader > 250 || gapFromAvg > 250) {
            return 1.25;
        }
        if (gapFromLeader > 150 || gapFromAvg > 150) {
            return 1.15;
        }
        if (gapFromLeader < -200) {
            return 0.95;
        }
        return 1.0;
    }

    private double clamp(double min, double max, double value) {
        return Math.max(min, Math.min(max, value));
    }
}
