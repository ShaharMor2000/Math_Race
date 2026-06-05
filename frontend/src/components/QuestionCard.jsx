import { useEffect, useMemo, useState } from "react";
import { DocNote } from "./DocNote";

export function QuestionCard({ question, onAnswer }) {
  const [remainingMs, setRemainingMs] = useState(question.maxTimeMs);
  const [submitting, setSubmitting] = useState(false);
  const startedAt = useMemo(() => Date.now(), [question.questionId]);

  useEffect(() => {
    setRemainingMs(question.maxTimeMs);
    const interval = window.setInterval(() => {
      setRemainingMs((prev) => Math.max(0, prev - 100));
    }, 100);
    return () => window.clearInterval(interval);
  }, [question.questionId, question.maxTimeMs]);

  const submit = async (answer) => {
    if (submitting) return;
    setSubmitting(true);
    const responseTimeMs = Date.now() - startedAt;
    await onAnswer(answer, responseTimeMs);
    setSubmitting(false);
  };

  return (
    <section className="card">
      <DocNote
        title="Question Card"
        text="Each question is time-bound on the client side. Response time and correctness are submitted to the server for scoring and progression updates."
      />
      <div className="row between">
        <h3>שאלה</h3>
        <span className="timer">{Math.ceil(remainingMs / 1000)} שניות</span>
      </div>
      <p className="question-text">{question.questionText}</p>
      <div className="grid-2">
        {question.options.map((option) => (
          <button key={option} onClick={() => void submit(option)} disabled={submitting || remainingMs === 0}>
            {option}
          </button>
        ))}
      </div>
    </section>
  );
}
