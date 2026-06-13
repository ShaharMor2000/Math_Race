import { Badge, Card } from "./ui/Primitives";
import { QuestionCard } from "./QuestionCard";

export function StudentRaceScreen({
  roomCode,
  progress,
  score,
  question,
  eventMessage,
  pendingPathDecision,
  answerFeedback,
  racePaused,
  onAnswer,
  onChoosePath,
  onSwapQuestion
}) {
  const pct = Math.max(0, Math.min(100, (progress / 1000) * 100));

  return (
    <section className="stack student-race-screen">
      <Card className="student-race-hero">
        <div className="student-race-top">
          <div>
            <Badge variant="live">מרוץ פעיל</Badge>
            <h2>חדר {roomCode}</h2>
          </div>
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
        </div>
        <div className="student-progress-track">
          <div className="student-progress-fill" style={{ width: `${pct}%` }} />
          <span className="student-progress-car" style={{ insetInlineStart: `${pct}%` }}>🏎️</span>
        </div>
      </Card>

      {racePaused ? (
        <div className="banner banner-warning student-paused">המרוץ הושהה על ידי המורה. המתן להמשך...</div>
      ) : null}

      {pendingPathDecision ? (
        <Card className="path-choice premium-path-choice">
          <h3>צומת — בחר מסלול</h3>
          <p className="muted">אוטוסטרדה = סיכון גבוה ותגמול גדול. דרך עפר = יציב ואיטי יותר.</p>
          <div className="path-choice-grid">
            <button type="button" className="highway-btn" onClick={() => void onChoosePath("HIGHWAY")}>
              <strong>אוטוסטרדה</strong>
              <span>שאלה קשה · בונוס ענק</span>
            </button>
            <button type="button" className="dirt-btn" onClick={() => void onChoosePath("DIRT_ROAD")}>
              <strong>דרך עפר</strong>
              <span>3 שאלות קלות · התקדמות בטוחה</span>
            </button>
          </div>
        </Card>
      ) : null}

      {!racePaused && question ? (
        <QuestionCard
          question={question}
          onAnswer={onAnswer}
          onSwap={onSwapQuestion}
          feedback={answerFeedback}
        />
      ) : null}

      {!racePaused && !question && !pendingPathDecision ? (
        <Card className="waiting-card premium-waiting">
          <div className="waiting-icon" aria-hidden="true">🧮</div>
          <p>ממתין לשאלה הבאה...</p>
        </Card>
      ) : null}

      {eventMessage ? <div className="event-toast">{eventMessage}</div> : null}
    </section>
  );
}
