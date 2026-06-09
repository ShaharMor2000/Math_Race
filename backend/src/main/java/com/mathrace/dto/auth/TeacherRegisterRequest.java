package com.mathrace.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TeacherRegisterRequest(
    @NotBlank @Size(max = 120) String fullName,
    @NotBlank @Size(max = 190) String email,
    @NotBlank @Size(min = 8, max = 72) String password
) {
}
