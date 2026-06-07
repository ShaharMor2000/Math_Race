package com.mathrace.service;

import com.mathrace.entity.RaceParticipant;
import com.mathrace.model.enums.DifficultyLevel;
import org.springframework.stereotype.Service;

@Service
public class DifficultyAdaptationService {

    public DifficultyLevel adaptDifficulty(
        DifficultyLevel baseDifficulty,
        RaceParticipant participant,
        int roomLeaderProgress,
        double roomAverageProgress
    ) {
        int total = participant.getCorrectCount() + participant.getWrongCount();
        if (total < 3) {
            return baseDifficulty;
        }

        double accuracy = (double) participant.getCorrectCount() / total;
        int gapFromLeader = roomLeaderProgress - participant.getProgressPoints();
        int gapFromAvg = (int) Math.round(roomAverageProgress - participant.getProgressPoints());

        if (gapFromLeader > 200 || gapFromAvg > 180 || accuracy < 0.45) {
            return easier(baseDifficulty);
        }
        if (accuracy > 0.85 && gapFromLeader < 80 && participant.getStreakCount() >= 3) {
            return harder(baseDifficulty);
        }
        return baseDifficulty;
    }

    private DifficultyLevel easier(DifficultyLevel level) {
        return switch (level) {
            case HARD -> DifficultyLevel.MEDIUM;
            case MEDIUM -> DifficultyLevel.EASY;
            case EASY -> DifficultyLevel.EASY;
        };
    }

    private DifficultyLevel harder(DifficultyLevel level) {
        return switch (level) {
            case EASY -> DifficultyLevel.MEDIUM;
            case MEDIUM -> DifficultyLevel.HARD;
            case HARD -> DifficultyLevel.HARD;
        };
    }
}
