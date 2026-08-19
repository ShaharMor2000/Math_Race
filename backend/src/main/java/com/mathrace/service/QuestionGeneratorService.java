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
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuestionGeneratorService {

    private final GeneratedQuestionRepository generatedQuestionRepository;
    private final QuestionTemplateRepository questionTemplateRepository;
    private final TemplateExpressionEvaluator expressionEvaluator;
    private final Random random = new Random();

    @Transactional
    public QuestionResponse generateNextQuestion(
        RaceRoom room,
        RaceParticipant participant,
        DifficultyLevel difficulty,
        boolean hintActive,
        boolean reducedOptions
    ) {
        QuestionTemplate template = pickTemplate(difficulty);
        Set<String> recentTexts = generatedQuestionRepository
            .findTop12ByRaceParticipantOrderByPresentedAtDesc(participant)
            .stream()
            .map(GeneratedQuestion::getQuestionText)
            .collect(Collectors.toSet());

        TemplateExpressionEvaluator.GeneratedQuestionData generatedData = null;
        for (int attempt = 0; attempt < 12; attempt++) {
            TemplateExpressionEvaluator.GeneratedQuestionData candidate = template != null
                ? expressionEvaluator.generate(
                    new TemplateExpressionEvaluator.QuestionTemplateView(
                        template.getExpressionPattern(),
                        template.getMinOperand(),
                        template.getMaxOperand(),
                        template.isAllowNegative()
                    ),
                    random
                )
                : fallbackQuestion(difficulty);
            generatedData = candidate;
            if (!recentTexts.contains(candidate.questionText())) {
                break;
            }
        }

        int answer = generatedData.answer();
        List<String> options = buildOptions(answer, reducedOptions || hintActive);

        GeneratedQuestion generated = new GeneratedQuestion();
        generated.setRaceRoom(room);
        generated.setRaceParticipant(participant);
        generated.setTemplate(template);
        generated.setDifficulty(difficulty);
        generated.setQuestionText(generatedData.questionText());
        generated.setCorrectAnswer(String.valueOf(answer));
        generated.setOptionsJson(String.join(",", options));
        generated.setSeedValue(random.nextLong());
        generated.setMaxTimeMs(room.getQuestionTimeMs());
        generated.setPresentedAt(LocalDateTime.now());
        generatedQuestionRepository.save(generated);

        return new QuestionResponse(
            generated.getId(),
            difficulty,
            generatedData.questionText(),
            options,
            generated.getMaxTimeMs(),
            generated.getPresentedAt(),
            hintActive,
            reducedOptions,
            false
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

    private TemplateExpressionEvaluator.GeneratedQuestionData fallbackQuestion(DifficultyLevel difficulty) {
        int a = randomOperand(2, 20);
        int b = randomOperand(2, 20);
        int c = randomOperand(1, 10);
        return switch (difficulty) {
            case EASY -> new TemplateExpressionEvaluator.GeneratedQuestionData(a + " + " + b + " = ?", a + b);
            case MEDIUM -> new TemplateExpressionEvaluator.GeneratedQuestionData(a + " x " + b + " = ?", a * b);
            case HARD -> new TemplateExpressionEvaluator.GeneratedQuestionData("(" + a + " x " + b + ") + " + c + " = ?", (a * b) + c);
        };
    }

    private int randomOperand(int min, int max) {
        int lower = Math.min(min, max);
        int upper = Math.max(min, max);
        return lower + random.nextInt((upper - lower) + 1);
    }

    private List<String> buildOptions(int answer, boolean reduced) {
        List<String> options = new ArrayList<>();
        options.add(String.valueOf(answer));
        options.add(String.valueOf(answer + randomOffset()));
        if (!reduced) {
            options.add(String.valueOf(answer - randomOffset()));
            options.add(String.valueOf(answer + randomOffset()));
        }
        options = options.stream().distinct().limit(reduced ? 2 : 4).toList();
        List<String> padded = new ArrayList<>(options);
        int target = reduced ? 2 : 4;
        while (padded.size() < target) {
            padded.add(String.valueOf(answer + randomOffset()));
        }
        Collections.shuffle(padded);
        return padded;
    }

    private int randomOffset() {
        return 1 + random.nextInt(9);
    }
}
