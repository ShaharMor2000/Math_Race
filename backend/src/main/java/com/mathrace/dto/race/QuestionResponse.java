package com.mathrace.dto.race;

import com.mathrace.model.enums.DifficultyLevel;

import java.time.LocalDateTime;
import java.util.List;

public record QuestionResponse(
    Long questionId,
    DifficultyLevel difficulty,
    String questionText,
    List<String> options,
    int maxTimeMs,
    LocalDateTime issuedAt
) {
}
