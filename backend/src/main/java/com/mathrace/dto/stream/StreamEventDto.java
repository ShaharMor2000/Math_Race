package com.mathrace.dto.stream;

import java.time.LocalDateTime;
import java.util.Map;

public record StreamEventDto(
    String roomCode,
    String type,
    LocalDateTime timestamp,
    Map<String, Object> payload
) {
}
