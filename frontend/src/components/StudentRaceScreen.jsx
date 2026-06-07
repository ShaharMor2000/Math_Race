import { QuestionCard } from "./QuestionCard";

export function StudentRaceScreen({
  roomCode,
  progress,
  score,
  question,
  eventMessage,
  pendingPathDecision,
  answerFeedback,
  onAnswer,
  onChoosePath,
  onSwapQuestion
}) {
  return (
    <section className="stack">
      <div className="card">
        <h2>מרוץ תלמיד - {roomCode}</h2>
        <p>התקדמות: {progress}/1000</p>
        <p>ניקוד: {score}</p>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(progress / 1000) * 100}%` }} />
        </div>
      </div>

      {pendingPathDecision ? (
        <div className="card path-choice">
          <h3>צומת — בחר מסלול</h3>
          <div className="row">
            <button className="highway-btn" onClick={() => void onChoosePath("HIGHWAY")}>
              אוטוסטרדה (סיכון/תגמול גבוה)
            </button>
            <button className="dirt-btn" onClick={() => void onChoosePath("DIRT_ROAD")}>
              דרך עפר (יציב ובטוח)
            </button>
          </div>
        </div>
      ) : null}

      {question ? (
        <QuestionCard
          question={question}
          onAnswer={onAnswer}
          onSwap={onSwapQuestion}
          feedback={answerFeedback}
        />
      ) : (
        <div className="card">ממתין לשאלה...</div>
      )}
      {eventMessage ? <div className="event-toast">{eventMessage}</div> : null}
    </section>
  );
}
