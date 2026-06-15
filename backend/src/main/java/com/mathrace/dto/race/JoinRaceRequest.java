package com.mathrace.dto.race;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record JoinRaceRequest(
    @NotBlank @Size(min = 4, max = 12) String roomCode,
    @NotBlank @Size(max = 80) String displayName,
    @Email @Size(max = 190) String email
) {
}
