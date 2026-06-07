package com.mathrace.service;

import org.springframework.stereotype.Service;

import java.util.Random;

@Service
public class TemplateExpressionEvaluator {

    public record GeneratedQuestionData(String questionText, int answer) {}

    public GeneratedQuestionData generate(QuestionTemplateView template, Random random) {
        int min = Math.min(template.minOperand(), template.maxOperand());
        int max = Math.max(template.minOperand(), template.maxOperand());
        String pattern = template.expressionPattern();

        int a = randomOperand(min, max, random);
        int b = randomOperand(min, max, random);
        int c = randomOperand(min, max, random);

        if (pattern.contains("/")) {
            b = Math.max(2, b);
            int quotient = randomOperand(Math.max(2, min), Math.max(2, max / Math.max(1, b)), random);
            a = b * quotient;
        } else if (pattern.contains("-") && !template.allowNegative()) {
            if (b > a) {
                int swap = a;
                a = b;
                b = swap;
            }
        }

        String display = substituteOperands(pattern, a, b, c);
        String evalExpr = display.replace(" x ", " * ").replace("×", "*");
        int answer = evaluate(evalExpr);

        return new GeneratedQuestionData(display + " = ?", answer);
    }

    private String substituteOperands(String pattern, int a, int b, int c) {
        String result = pattern;
        result = result.replace("{a}", String.valueOf(a));
        result = result.replace("{b}", String.valueOf(b));
        result = result.replace("{c}", String.valueOf(c));
        return result;
    }

    private int randomOperand(int min, int max, Random random) {
        if (min > max) {
            int swap = min;
            min = max;
            max = swap;
        }
        return min + random.nextInt((max - min) + 1);
    }

    int evaluate(String expression) {
        return new Parser(expression.replace(" ", "")).parse();
    }

    public record QuestionTemplateView(String expressionPattern, int minOperand, int maxOperand, boolean allowNegative) {}

    private static final class Parser {
        private final String input;
        private int pos;

        Parser(String input) {
            this.input = input;
            this.pos = 0;
        }

        int parse() {
            int value = parseExpression();
            if (pos < input.length()) {
                throw new IllegalArgumentException("Unexpected character at position " + pos);
            }
            return value;
        }

        private int parseExpression() {
            int value = parseTerm();
            while (pos < input.length()) {
                char op = input.charAt(pos);
                if (op == '+') {
                    pos++;
                    value += parseTerm();
                } else if (op == '-') {
                    pos++;
                    value -= parseTerm();
                } else {
                    break;
                }
            }
            return value;
        }

        private int parseTerm() {
            int value = parseFactor();
            while (pos < input.length()) {
                char op = input.charAt(pos);
                if (op == '*') {
                    pos++;
                    value *= parseFactor();
                } else if (op == '/') {
                    pos++;
                    int divisor = parseFactor();
                    if (divisor == 0) {
                        throw new IllegalArgumentException("Division by zero");
                    }
                    value /= divisor;
                } else {
                    break;
                }
            }
            return value;
        }

        private int parseFactor() {
            if (input.charAt(pos) == '(') {
                pos++;
                int value = parseExpression();
                if (pos >= input.length() || input.charAt(pos) != ')') {
                    throw new IllegalArgumentException("Missing closing parenthesis");
                }
                pos++;
                return value;
            }
            return parseNumber();
        }

        private int parseNumber() {
            int start = pos;
            if (pos < input.length() && input.charAt(pos) == '-') {
                pos++;
            }
            while (pos < input.length() && Character.isDigit(input.charAt(pos))) {
                pos++;
            }
            if (start == pos || (input.charAt(start) == '-' && start + 1 == pos)) {
                throw new IllegalArgumentException("Expected number at position " + pos);
            }
            return Integer.parseInt(input.substring(start, pos));
        }
    }
}
