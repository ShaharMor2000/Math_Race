package com.mathrace.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApi(ApiException ex) {
        return ResponseEntity
            .status(resolveStatus(ex.getCode()))
            .body(new ErrorResponse(ex.getCode(), ex.getMessage(), null));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.putIfAbsent(error.getField(), error.getDefaultMessage());
        }
        String message = fieldErrors.values().stream().findFirst().orElse("פרטי ההרשמה אינם תקינים");
        return ResponseEntity.badRequest()
            .body(new ErrorResponse("VALIDATION_ERROR", message, fieldErrors));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        return ResponseEntity
            .status(HttpStatus.METHOD_NOT_ALLOWED)
            .body(new ErrorResponse(
                "METHOD_NOT_ALLOWED",
                "הפעולה אינה נתמכת בכתובת הזו",
                Map.of("method", ex.getMethod(), "supportedMethods", ex.getSupportedMethods())
            ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
        log.error("Unhandled server error", ex);
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ErrorResponse("INTERNAL_ERROR", "אירעה שגיאה בשרת", ex.getClass().getSimpleName()));
    }

    private HttpStatus resolveStatus(String code) {
        if (code == null) {
            return HttpStatus.BAD_REQUEST;
        }
        return switch (code) {
            case "UNAUTHORIZED", "INVALID_CREDENTIALS", "INVALID_PASSWORD" -> HttpStatus.UNAUTHORIZED;
            case "FORBIDDEN" -> HttpStatus.FORBIDDEN;
            case "ROOM_NOT_FOUND", "PARTICIPANT_NOT_FOUND", "QUESTION_NOT_FOUND", "TEACHER_NOT_FOUND", "USER_NOT_FOUND" -> HttpStatus.NOT_FOUND;
            case "EMAIL_SEND_FAILED", "EMAIL_NOT_CONFIGURED" -> HttpStatus.INTERNAL_SERVER_ERROR;
            case "RATE_LIMITED" -> HttpStatus.TOO_MANY_REQUESTS;
            default -> HttpStatus.BAD_REQUEST;
        };
    }
}
