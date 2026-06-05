package com.mathrace.dto.race;

import java.util.List;

public record FinalResultsResponse(
    String roomCode,
    Long winnerParticipantId,
    List<ResultRow> leaderboard
) {
    public record ResultRow(
        int rank,
        String displayName,
        int finalProgress,
        int finalScore,
        double accuracyPct
    ) {}
}
