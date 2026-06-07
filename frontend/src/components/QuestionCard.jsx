import { useEffect, useMemo, useRef, useState } from "react";

export function QuestionCard({ question, onAnswer, onSwap, feedback }) {
  const [remainingMs, setRemainingMs] = useState(question.maxTimeMs);
  const [submitting, setSubmitting] = useState(false);
  const startedAt = useMemo(() => Date.now(), [question.questionId]);
  const timedOutRef = useRef(false);

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
    await onAnswer(answer, responseTimeMs);
    setSubmitting(false);
  };

  const timerClass = remainingMs < 3000 ? "timer danger" : "timer";

  return (
    <section className={`card question-card ${feedback || ""}`}>
      <div className="row between">
        <h3>שאלה</h3>
        <span className={timerClass}>{Math.ceil(remainingMs / 1000)} שניות</span>
      </div>
      {question.hintActive ? <p className="hint-banner">רמז פעיל — פחות אפשרויות תשובה</p> : null}
      <p className="question-text">{question.questionText}</p>
      <div className={question.options.length <= 2 ? "grid-2" : "grid-2"}>
        {question.options.map((option) => (
          <button key={option} onClick={() => void submit(option)} disabled={submitting || remainingMs === 0}>
            {option}
          </button>
        ))}
      </div>
      {question.swapAvailable ? (
        <button className="ghost swap-btn" type="button" disabled={submitting} onClick={() => void onSwap?.()}>
          החלף שאלה
        </button>
      ) : null}
    </section>
  );
}
