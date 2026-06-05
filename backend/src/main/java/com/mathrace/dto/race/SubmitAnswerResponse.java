package com.mathrace.dto.race;

public record SubmitAnswerResponse(
    boolean isCorrect,
    int deltaPoints,
    int newProgress,
    int newScore,
    int streakCount,
    EventData triggeredEvent
) {
    public record EventData(String type, int impactPoints, String message) {}
}
