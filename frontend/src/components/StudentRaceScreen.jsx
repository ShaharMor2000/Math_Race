import { DocNote } from "./DocNote";
import { QuestionCard } from "./QuestionCard";

export function StudentRaceScreen({
  roomCode,
  progress,
  score,
  question,
  eventMessage,
  pendingPathDecision,
  onAnswer,
  onChoosePath
}) {
  return (
    <section className="stack">
      <div className="card">
        <h2>מרוץ תלמיד - {roomCode}</h2>
        <DocNote
          title="Student Race Screen"
          text="This page is the active gameplay UI for each student. It shows personal progress, score, path-choice events, question flow, and live feedback."
        />
        <p>התקדמות: {progress}/1000</p>
        <p>ניקוד: {score}</p>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(progress / 1000) * 100}%` }} />
        </div>
      </div>

      {pendingPathDecision ? (
        <div className="card row">
          <button onClick={() => void onChoosePath("HIGHWAY")}>אוטוסטרדה (סיכון/תגמול)</button>
          <button onClick={() => void onChoosePath("DIRT_ROAD")}>דרך עפר (יציב)</button>
        </div>
      ) : null}

      {question ? <QuestionCard question={question} onAnswer={onAnswer} /> : <div className="card">ממתין לשאלה...</div>}
      {eventMessage ? <div className="event-toast">{eventMessage}</div> : null}
    </section>
  );
}
