package com.mathrace.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApi(ApiException ex) {
        return ResponseEntity
            .status(resolveStatus(ex.getCode()))
            .body(new ErrorResponse(ex.getCode(), ex.getMessage(), null));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        return ResponseEntity.badRequest()
            .body(new ErrorResponse("VALIDATION_ERROR", "Validation failed", ex.getMessage()));
    }

    private HttpStatus resolveStatus(String code) {
        if (code == null) {
            return HttpStatus.BAD_REQUEST;
        }
        return switch (code) {
            case "UNAUTHORIZED", "INVALID_CREDENTIALS" -> HttpStatus.UNAUTHORIZED;
            case "FORBIDDEN" -> HttpStatus.FORBIDDEN;
            case "ROOM_NOT_FOUND", "PARTICIPANT_NOT_FOUND", "QUESTION_NOT_FOUND", "TEACHER_NOT_FOUND" -> HttpStatus.NOT_FOUND;
            case "RATE_LIMITED" -> HttpStatus.TOO_MANY_REQUESTS;
            default -> HttpStatus.BAD_REQUEST;
        };
    }
}
