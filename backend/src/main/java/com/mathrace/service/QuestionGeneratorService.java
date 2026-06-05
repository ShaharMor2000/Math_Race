package com.mathrace.service;

import com.mathrace.dto.race.QuestionResponse;
import com.mathrace.entity.GeneratedQuestion;
import com.mathrace.entity.QuestionTemplate;
import com.mathrace.entity.RaceParticipant;
import com.mathrace.entity.RaceRoom;
import com.mathrace.model.enums.DifficultyLevel;
import com.mathrace.repository.GeneratedQuestionRepository;
import com.mathrace.repository.QuestionTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class QuestionGeneratorService {

    private final GeneratedQuestionRepository generatedQuestionRepository;
    private final QuestionTemplateRepository questionTemplateRepository;
    private final Random random = new Random();

    @Transactional
    public QuestionResponse generateNextQuestion(RaceRoom room, RaceParticipant participant, DifficultyLevel difficulty) {
        QuestionTemplate template = pickTemplate(difficulty);
        int a = randomOperand(template == null ? 2 : template.getMinOperand(), template == null ? 20 : template.getMaxOperand());
        int b = randomOperand(template == null ? 2 : template.getMinOperand(), template == null ? 20 : template.getMaxOperand());
        int c = randomOperand(1, 10);

        String questionText;
        int answer;
        if (difficulty == DifficultyLevel.EASY) {
            questionText = a + " + " + b + " = ?";
            answer = a + b;
        } else if (difficulty == DifficultyLevel.MEDIUM) {
            questionText = a + " x " + b + " = ?";
            answer = a * b;
        } else {
            questionText = "(" + a + " x " + b + ") + " + c + " = ?";
            answer = (a * b) + c;
        }

        List<String> options = buildOptions(answer);
        GeneratedQuestion generated = new GeneratedQuestion();
        generated.setRaceRoom(room);
        generated.setRaceParticipant(participant);
        generated.setTemplate(template);
        generated.setDifficulty(difficulty);
        generated.setQuestionText(questionText);
        generated.setCorrectAnswer(String.valueOf(answer));
        generated.setOptionsJson(String.join(",", options));
        generated.setSeedValue(random.nextLong());
        generated.setMaxTimeMs(room.getQuestionTimeMs());
        generated.setPresentedAt(LocalDateTime.now());
        generatedQuestionRepository.save(generated);

        return new QuestionResponse(
            generated.getId(),
            difficulty,
            questionText,
            options,
            generated.getMaxTimeMs(),
            generated.getPresentedAt()
        );
    }

    @Transactional(readOnly = true)
    public GeneratedQuestion getQuestionOrThrow(Long questionId) {
        return generatedQuestionRepository.findById(questionId)
            .orElseThrow(() -> new IllegalArgumentException("Question not found"));
    }

    private QuestionTemplate pickTemplate(DifficultyLevel difficulty) {
        List<QuestionTemplate> templates = questionTemplateRepository.findByDifficultyAndIsActiveTrue(difficulty);
        if (templates.isEmpty()) {
            return null;
        }
        return templates.get(random.nextInt(templates.size()));
    }

    private int randomOperand(int min, int max) {
        int lower = Math.min(min, max);
        int upper = Math.max(min, max);
        return lower + random.nextInt((upper - lower) + 1);
    }

    private List<String> buildOptions(int answer) {
        List<String> options = new ArrayList<>();
        options.add(String.valueOf(answer));
        options.add(String.valueOf(answer + randomOffset()));
        options.add(String.valueOf(answer - randomOffset()));
        options.add(String.valueOf(answer + randomOffset()));
        options = options.stream().distinct().limit(4).toList();
        List<String> padded = new ArrayList<>(options);
        while (padded.size() < 4) {
            padded.add(String.valueOf(answer + randomOffset()));
        }
        Collections.shuffle(padded);
        return padded;
    }

    private int randomOffset() {
        return 1 + random.nextInt(9);
    }
}
