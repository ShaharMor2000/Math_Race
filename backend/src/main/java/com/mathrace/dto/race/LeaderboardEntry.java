package com.mathrace.dto.race;

public record LeaderboardEntry(
    Long participantId,
    String displayName,
    int progress,
    int score,
    int rank
) {
}
