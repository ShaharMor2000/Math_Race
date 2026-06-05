package com.mathrace.exception;

public record ErrorResponse(
    String code,
    String message,
    Object details
) {
}
