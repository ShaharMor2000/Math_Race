import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Card } from "./ui/Primitives";

export function QuestionCard({ question, onAnswer, onSwap, feedback }) {
  const [remainingMs, setRemainingMs] = useState(question.maxTimeMs);
  const [submitting, setSubmitting] = useState(false);
  const startedAt = useMemo(() => Date.now(), [question.questionId]);
  const timedOutRef = useRef(false);
  const timerPct = Math.max(0, Math.min(100, (remainingMs / question.maxTimeMs) * 100));

  useEffect(() => {
    setRemainingMs(question.maxTimeMs);
    timedOutRef.current = false;
    const interval = window.setInterval(() => {
      setRemainingMs((prev) => Math.max(0, prev - 100));
    }, 100);
    return () => window.clearInterval(interval);
  }, [question.questionId, question.maxTimeMs]);

  useEffect(() => {
    if (remainingMs > 0 || submitting || timedOutRef.current) return;
    timedOutRef.current = true;
    void submit("");
  }, [remainingMs, submitting]);

  const submit = async (answer) => {
    if (submitting) return;
    setSubmitting(true);
    const responseTimeMs = Date.now() - startedAt;
    try {
      await onAnswer(answer, responseTimeMs);
    } finally {
      setSubmitting(false);
    }
  };

  const timerDanger = remainingMs < 3000;
  const formattedQuestion = question.questionText
    .replace(/\bx\b/g, "×")
    .replace(/\*/g, "×")
    .replace(/\s+/g, " ")
    .trim();

  return (
    <Card className={`question-card-premium ${feedback || ""}`}>
      <div className="question-card-top">
        <div>
          <p className="page-kicker">שאלה חדשה</p>
          <Badge variant="default">{question.difficulty || "MEDIUM"}</Badge>
        </div>
        <div className={`question-timer ${timerDanger ? "danger" : ""}`} aria-live="polite">
          <div className="question-timer-ring" style={{ background: `conic-gradient(var(--color-accent) ${timerPct}%, rgba(255,255,255,0.08) 0)` }} />
          <strong>{Math.ceil(remainingMs / 1000)}</strong>
          <span>שניות</span>
        </div>
      </div>

      {question.hintActive ? (
        <div className="banner banner-info">רמז פעיל — פחות אפשרויות תשובה</div>
      ) : null}

      <p className="question-text-premium" dir="ltr">{formattedQuestion}</p>

      <div className="question-options">
        {question.options.map((option) => (
          <Button
            key={option}
            variant="secondary"
            className="question-option-btn"
            disabled={submitting || remainingMs === 0}
            onClick={() => void submit(option)}
          >
            {option}
          </Button>
        ))}
      </div>

      {question.swapAvailable ? (
        <Button variant="ghost" className="swap-btn" disabled={submitting} onClick={() => void onSwap?.()}>
          החלף שאלה
        </Button>
      ) : null}
    </Card>
  );
}
