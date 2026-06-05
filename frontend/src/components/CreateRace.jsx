import { useState } from "react";
import { DocNote } from "./DocNote";

export function CreateRace({ onSubmit, onCancel }) {
  const [title, setTitle] = useState("מרוץ חשבון");
  const [className, setClassName] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(8);
  const [questionTimeMs, setQuestionTimeMs] = useState(15000);
  const [initialDifficulty, setInitialDifficulty] = useState("MEDIUM");
  const [enableLuckEvents, setEnableLuckEvents] = useState(true);
  const [enablePathChoice, setEnablePathChoice] = useState(true);

  const submit = async (e) => {
    e.preventDefault();
    await onSubmit({
      title,
      className,
      maxParticipants,
      questionTimeMs,
      initialDifficulty,
      enableLuckEvents,
      enablePathChoice
    });
  };

  return (
    <section className="card">
      <h2>יצירת מרוץ חדש</h2>
      <DocNote
        title="Create Race Page"
        text="Configure race settings here: participant limit, question timer, starting difficulty, and optional game mechanics such as luck events and path decisions."
      />
      <form onSubmit={submit} className="stack">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="שם המרוץ" required />
        <input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="כיתה" />
        <label>
          משתתפים מקסימלי
          <input
            type="number"
            min={1}
            max={8}
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(Number(e.target.value))}
          />
        </label>
        <label>
          זמן שאלה (ms)
          <input
            type="number"
            min={5000}
            max={60000}
            value={questionTimeMs}
            onChange={(e) => setQuestionTimeMs(Number(e.target.value))}
          />
        </label>
        <label>
          קושי התחלתי
          <select value={initialDifficulty} onChange={(e) => setInitialDifficulty(e.target.value)}>
            <option value="EASY">קל</option>
            <option value="MEDIUM">בינוני</option>
            <option value="HARD">קשה</option>
          </select>
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={enableLuckEvents}
            onChange={(e) => setEnableLuckEvents(e.target.checked)}
          />
          אירועי מזל
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={enablePathChoice}
            onChange={(e) => setEnablePathChoice(e.target.checked)}
          />
          בחירת מסלול (אוטוסטרדה/דרך עפר)
        </label>
        <div className="row">
          <button type="submit">צור חדר</button>
          <button type="button" className="ghost" onClick={onCancel}>
            ביטול
          </button>
        </div>
      </form>
    </section>
  );
}
