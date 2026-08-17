package com.mathrace.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mathrace.repository.RaceRoomRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:archive_endpoint_test;MODE=MySQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.sql.init.mode=never"
})
class TeacherRaceArchiveEndpointTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RaceRoomRepository raceRoomRepository;

    @Test
    void deleteTeacherRaceArchivesRoomAndExcludesItFromTeacherList() throws Exception {
        String email = "archive-" + System.nanoTime() + "@example.com";
        String password = "Test1234!";

        mockMvc.perform(post("/api/v1/auth/teacher/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fullName": "Archive Test Teacher",
                      "email": "%s",
                      "password": "%s"
                    }
                    """.formatted(email, password)))
            .andExpect(status().isCreated());

        String loginJson = mockMvc.perform(post("/api/v1/auth/teacher/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "%s",
                      "password": "%s"
                    }
                    """.formatted(email, password)))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
        String token = objectMapper.readTree(loginJson).get("accessToken").asText();

        String createJson = mockMvc.perform(post("/api/v1/teacher/races")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "title": "Archive Flow",
                      "className": "Codex",
                      "maxParticipants": 4,
                      "questionTimeMs": 15000,
                      "initialDifficulty": "MEDIUM",
                      "enableLuckEvents": true,
                      "enablePathChoice": true,
                      "raceDurationMinutes": 10
                    }
                    """))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();
        String roomCode = objectMapper.readTree(createJson).get("roomCode").asText();

        mockMvc.perform(delete("/api/v1/teacher/races/{roomCode}", roomCode)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());

        assertThat(raceRoomRepository.findByRoomCode(roomCode))
            .isPresent()
            .get()
            .extracting("archivedAt")
            .isNotNull();

        String listJson = mockMvc.perform(get("/api/v1/teacher/races")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
        for (JsonNode room : objectMapper.readTree(listJson)) {
            assertThat(room.get("roomCode").asText()).isNotEqualTo(roomCode);
        }
    }
}
