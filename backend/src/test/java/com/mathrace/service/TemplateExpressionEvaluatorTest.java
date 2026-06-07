package com.mathrace.service;

import org.junit.jupiter.api.Test;

import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TemplateExpressionEvaluatorTest {

    private final TemplateExpressionEvaluator evaluator = new TemplateExpressionEvaluator();

    @Test
    void evaluatesAdditionPattern() {
        TemplateExpressionEvaluator.GeneratedQuestionData data = evaluator.generate(
            new TemplateExpressionEvaluator.QuestionTemplateView("{a} + {b}", 2, 10, false),
            new Random(7)
        );
        assertTrue(data.questionText().contains("="));
        assertTrue(data.answer() > 0);
    }

    @Test
    void evaluatesMixedExpression() {
        assertEquals(17, evaluator.evaluate("(4*3)+5"));
        assertEquals(4, evaluator.evaluate("12/3"));
    }
}
