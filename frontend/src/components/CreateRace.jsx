import { useState } from "react";

const difficultyOptions = [
  { value: "EASY", label: "קל", hint: "פתיחה רגועה" },
  { value: "MEDIUM", label: "בינוני", hint: "מאוזן לכיתה" },
  { value: "HARD", label: "קשה", hint: "אתגר מהיר" }
];

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

  const questionTimeSeconds = Math.round(questionTimeMs / 1000);

  return (
    <section className="create-race" dir="rtl">
      <div className="create-race-hero">
        <div>
          <p className="section-kicker">הגדרת מרוץ</p>
          <h2>יצירת מרוץ חדש</h2>
          <p>בחרו את פרטי הכיתה, קצב השאלות ומכניקות המשחק לפני פתיחת החדר לתלמידים.</p>
        </div>
        <div className="race-preview" aria-label="תצוגה מקדימה של המרוץ">
          <span className="race-preview-label">חדר חדש</span>
          <strong>{title || "מרוץ חשבון"}</strong>
          <small>{className || "ללא כיתה"} · עד {maxParticipants} משתתפים</small>
        </div>
      </div>

      <form onSubmit={submit} className="create-race-form">
        <div className="create-race-panel">
          <div className="panel-heading">
            <span className="panel-icon" aria-hidden="true">1</span>
            <div>
              <h3>פרטי המרוץ</h3>
              <p>שם ברור יעזור לתלמידים לזהות את החדר הנכון.</p>
            </div>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>שם המרוץ</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="מרוץ חשבון" required />
            </label>
            <label className="field">
              <span>כיתה</span>
              <input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="לדוגמה: ד׳ 2" />
            </label>
          </div>
        </div>

        <div className="create-race-panel">
          <div className="panel-heading">
            <span className="panel-icon" aria-hidden="true">2</span>
            <div>
              <h3>קצב ומספר משתתפים</h3>
              <p>כוונו את העומס לפי גודל הכיתה ורמת הביטחון של התלמידים.</p>
            </div>
          </div>

          <div className="control-grid">
            <label className="range-field">
              <span className="range-field-top">
                <span>משתתפים מקסימלי</span>
                <strong>{maxParticipants}</strong>
              </span>
              <input
                type="range"
                min={1}
                max={8}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Number(e.target.value))}
              />
            </label>

            <label className="range-field">
              <span className="range-field-top">
                <span>זמן לכל שאלה</span>
                <strong>{questionTimeSeconds} שנ׳</strong>
              </span>
              <input
                type="range"
                min={5000}
                max={60000}
                step={5000}
                value={questionTimeMs}
                onChange={(e) => setQuestionTimeMs(Number(e.target.value))}
              />
            </label>
          </div>
        </div>

        <div className="create-race-panel">
          <div className="panel-heading">
            <span className="panel-icon" aria-hidden="true">3</span>
            <div>
              <h3>רמת פתיחה</h3>
              <p>המשחק יתחיל מהרמה הזו ויתקדם לפי ביצועי התלמידים.</p>
            </div>
          </div>

          <div className="difficulty-picker" role="radiogroup" aria-label="רמת קושי התחלתית">
            {difficultyOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={initialDifficulty === option.value ? "difficulty-option active" : "difficulty-option"}
                onClick={() => setInitialDifficulty(option.value)}
                role="radio"
                aria-checked={initialDifficulty === option.value}
              >
                <span>{option.label}</span>
                <small>{option.hint}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="create-race-panel">
          <div className="panel-heading">
            <span className="panel-icon" aria-hidden="true">4</span>
            <div>
              <h3>מכניקות משחק</h3>
              <p>אפשר להוסיף אירועים שמכניסים מתח והחלטות בזמן המרוץ.</p>
            </div>
          </div>

          <div className="toggle-grid">
            <label className="feature-toggle">
              <input
                type="checkbox"
                checked={enableLuckEvents}
                onChange={(e) => setEnableLuckEvents(e.target.checked)}
              />
              <span className="toggle-control" aria-hidden="true"></span>
              <span>
                <strong>אירועי מזל</strong>
                <small>בונוסים והפתעות במהלך המרוץ</small>
              </span>
            </label>

            <label className="feature-toggle">
              <input
                type="checkbox"
                checked={enablePathChoice}
                onChange={(e) => setEnablePathChoice(e.target.checked)}
              />
              <span className="toggle-control" aria-hidden="true"></span>
              <span>
                <strong>בחירת מסלול</strong>
                <small>אוטוסטרדה או דרך עפר ברגעי החלטה</small>
              </span>
            </label>
          </div>
        </div>

        <div className="create-race-actions">
          <button type="button" className="ghost create-cancel" onClick={onCancel}>
            ביטול
          </button>
          <button type="submit" className="create-submit">
            צור חדר
          </button>
        </div>
      </form>
    </section>
  );
}
