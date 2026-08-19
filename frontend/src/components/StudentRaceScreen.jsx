import { useEffect, useRef, useState } from "react";
import { Badge, Button, Card } from "./ui/Primitives";
import { QuestionCard } from "./QuestionCard";

const DECISION_TIME_MS = 10000;

const raceStatusLabels = {
  LOBBY: "ממתין להתחלה",
  LOCKED: "ממתין להתחלה",
  RUNNING: "מרוץ פעיל",
  PAUSED: "מרוץ מושהה"
};

export function StudentRaceScreen({
  roomCode,
  raceStatus,
  progress,
  score,
  question,
  eventMessage,
  pendingPathDecision,
  answerFeedback,
  racePaused,
  onAnswer,
  onChoosePath,
  onDecisionTimeout,
  onSwapQuestion,
  onLeaveRace
}) {
  const [decisionRemainingMs, setDecisionRemainingMs] = useState(DECISION_TIME_MS);
  const decisionTimedOutRef = useRef(false);
  const pct = Math.max(0, Math.min(100, (progress / 1000) * 100));
  const isWaitingForStart = !raceStatus || raceStatus === "LOBBY" || raceStatus === "LOCKED";
  const decisionEventActive = !isWaitingForStart && Boolean(pendingPathDecision);
  const canLeave = Boolean(onLeaveRace) && raceStatus !== "FINISHED" && raceStatus !== "CANCELLED";
  const leaveLabel = isWaitingForStart ? "ביטול הרשמה" : "יציאה מהמרוץ";
  const decisionTimerPct = Math.max(0, Math.min(100, (decisionRemainingMs / DECISION_TIME_MS) * 100));
  const decisionTimerDanger = decisionRemainingMs < 3000;

  useEffect(() => {
    if (!decisionEventActive) {
      setDecisionRemainingMs(DECISION_TIME_MS);
      decisionTimedOutRef.current = false;
      return undefined;
    }

    setDecisionRemainingMs(DECISION_TIME_MS);
    decisionTimedOutRef.current = false;
    const interval = window.setInterval(() => {
      setDecisionRemainingMs((prev) => Math.max(0, prev - 100));
    }, 100);
    return () => window.clearInterval(interval);
  }, [decisionEventActive]);

  useEffect(() => {
    if (!decisionEventActive || decisionRemainingMs > 0 || decisionTimedOutRef.current) return;
    decisionTimedOutRef.current = true;
    void onDecisionTimeout?.();
  }, [decisionEventActive, decisionRemainingMs, onDecisionTimeout]);

  const chooseDecisionPath = (choice) => {
    if (!decisionEventActive || decisionTimedOutRef.current) return;
    decisionTimedOutRef.current = true;
    void onChoosePath(choice);
  };

  return (
    <section className="stack student-race-screen">
      <Card className="student-race-hero">
        <div className="student-race-top">
          <div>
            <Badge variant={isWaitingForStart ? "warning" : "live"}>
              {raceStatusLabels[raceStatus] || "מרוץ"}
            </Badge>
            <h2>חדר {roomCode}</h2>
          </div>
          <div className="student-race-top-actions">
            <div className="student-race-stats">
              <div>
                <span className="muted">התקדמות</span>
                <strong>{progress}/1000</strong>
              </div>
              <div>
                <span className="muted">ניקוד</span>
                <strong>{score}</strong>
              </div>
            </div>
            {canLeave ? (
              <Button variant="ghost" size="sm" onClick={() => void onLeaveRace()}>
                {leaveLabel}
              </Button>
            ) : null}
          </div>
        </div>
        <div className="student-progress-track">
          <div className="student-progress-fill" style={{ width: `${pct}%` }} />
          <span className="student-progress-car" style={{ insetInlineStart: `${pct}%` }}>🏎️</span>
        </div>
      </Card>

      {isWaitingForStart ? (
        <Card className="waiting-card premium-waiting">
          <div className="waiting-icon" aria-hidden="true">⏳</div>
          <h3>נכנסת לחדר המרוץ</h3>
          <p>ממתין שהמורה יתחיל את המרוץ...</p>
          {canLeave ? (
            <Button variant="ghost" onClick={() => void onLeaveRace()}>
              ביטול הרשמה
            </Button>
          ) : null}
        </Card>
      ) : null}

      {!isWaitingForStart && racePaused ? (
        <div className="banner banner-warning student-paused">המרוץ הושהה על ידי המורה. המתן להמשך...</div>
      ) : null}

      {decisionEventActive ? (
        <Card className="path-choice premium-path-choice">
          <div className="question-card-top">
            <h3>צומת - בחר מסלול</h3>
            <div className={`question-timer ${decisionTimerDanger ? "danger" : ""}`} aria-live="polite">
              <div className="question-timer-ring" style={{ background: `conic-gradient(var(--color-accent) ${decisionTimerPct}%, rgba(255,255,255,0.08) 0)` }} />
              <strong>{Math.ceil(decisionRemainingMs / 1000)}</strong>
              <span>שניות</span>
            </div>
          </div>
          <p className="muted">אוטוסטרדה = סיכון גבוה ותגמול גדול. דרך עפר = יציב ואיטי יותר.</p>
          <div className="path-choice-grid">
            <button type="button" className="highway-btn" onClick={() => chooseDecisionPath("HIGHWAY")}>
              <strong>אוטוסטרדה</strong>
              <span>שאלה קשה · בונוס ענק</span>
            </button>
            <button type="button" className="dirt-btn" onClick={() => chooseDecisionPath("DIRT_ROAD")}>
              <strong>דרך עפר</strong>
              <span>3 שאלות קלות · התקדמות בטוחה</span>
            </button>
          </div>
        </Card>
      ) : null}

      {!isWaitingForStart && !racePaused && question ? (
        <div style={{ display: decisionEventActive ? "none" : "block" }} aria-hidden={decisionEventActive}>
          <QuestionCard
            key={question.questionId}
            question={question}
            onAnswer={onAnswer}
            onSwap={onSwapQuestion}
            feedback={answerFeedback}
            paused={decisionEventActive}
          />
        </div>
      ) : null}

      {!isWaitingForStart && !racePaused && !question && !decisionEventActive ? (
        <Card className="waiting-card premium-waiting">
          <div className="waiting-icon" aria-hidden="true">∑</div>
          <p>ממתין לשאלה הבאה...</p>
        </Card>
      ) : null}

      {eventMessage ? <div className="event-toast">{eventMessage}</div> : null}
    </section>
  );
}
