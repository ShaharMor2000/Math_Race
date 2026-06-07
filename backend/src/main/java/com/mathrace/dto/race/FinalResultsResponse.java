package com.mathrace.dto.race;

import java.util.List;

public record FinalResultsResponse(
    String roomCode,
    Long winnerParticipantId,
    String winnerName,
    List<ResultRow> leaderboard
) {
    public record ResultRow(
        int rank,
        String displayName,
        int finalProgress,
        int finalScore,
        double accuracyPct,
        Integer avgResponseMs,
        int totalCorrect,
        int totalWrong,
        int totalEvents
    ) {}
}
