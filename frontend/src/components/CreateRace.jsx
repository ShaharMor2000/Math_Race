import { useState } from "react";

const difficultyOptions = [
  { value: "EASY", label: "קל", hint: "פתיחה רגועה" },
  { value: "MEDIUM", label: "בינוני", hint: "מאוזן לכיתה" },
  { value: "HARD", label: "קשה", hint: "אתגר מהיר" }
];

const steps = [
  { id: 1, title: "פרטי המרוץ" },
  { id: 2, title: "קצב ומשתתפים" },
  { id: 3, title: "רמת פתיחה" },
  { id: 4, title: "מכניקות משחק" }
];

export function CreateRace({ mode = "create", initialValues = {}, onSubmit, onCancel }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [stepError, setStepError] = useState("");
  const [title, setTitle] = useState(initialValues.title || "");
  const [className, setClassName] = useState(initialValues.className || "");
  const [maxParticipants, setMaxParticipants] = useState(initialValues.maxParticipants ?? null);
  const [questionTimeMs, setQuestionTimeMs] = useState(initialValues.questionTimeMs ?? null);
  const [initialDifficulty, setInitialDifficulty] = useState(initialValues.initialDifficulty || "");
  const [enableLuckEvents, setEnableLuckEvents] = useState(initialValues.enableLuckEvents ?? true);
  const [enablePathChoice, setEnablePathChoice] = useState(initialValues.enablePathChoice ?? true);
  const [raceDurationMinutes, setRaceDurationMinutes] = useState(initialValues.raceDurationMinutes ?? null);
  const isEditMode = mode === "edit";

  const questionTimeSeconds = questionTimeMs === null ? null : Math.round(questionTimeMs / 1000);
  const isLastStep = currentStep === steps.length;
  const selectedDifficulty = difficultyOptions.find((option) => option.value === initialDifficulty);

  const submit = async (event) => {
    event.preventDefault();

    if (currentStep === 2 && maxParticipants === null) {
      setStepError("בחרי מספר משתתפים כדי להמשיך.");
      return;
    }

    if (currentStep === 2 && questionTimeMs === null) {
      setStepError("בחרי זמן לכל שאלה כדי להמשיך.");
      return;
    }

    if (currentStep === 2 && raceDurationMinutes === null) {
      setStepError("בחרי משך מרוץ כדי להמשיך.");
      return;
    }

    if (currentStep === 3 && !initialDifficulty) {
      setStepError("בחרי רמת פתיחה כדי להמשיך.");
      return;
    }

    if (!isLastStep) {
      setStepError("");
      setCurrentStep((step) => Math.min(step + 1, steps.length));
      return;
    }

    if (!title.trim()) {
      setCurrentStep(1);
      setStepError("השלימי שם מרוץ לפני יצירת החדר.");
      return;
    }

    if (maxParticipants === null) {
      setCurrentStep(2);
      setStepError("בחרי מספר משתתפים לפני יצירת החדר.");
      return;
    }

    if (questionTimeMs === null) {
      setCurrentStep(2);
      setStepError("בחרי זמן לכל שאלה לפני יצירת החדר.");
      return;
    }

    if (raceDurationMinutes === null) {
      setCurrentStep(2);
      setStepError("בחרי משך מרוץ לפני יצירת החדר.");
      return;
    }

    if (!initialDifficulty) {
      setCurrentStep(3);
      setStepError("בחרי רמת פתיחה לפני יצירת החדר.");
      return;
    }

    await onSubmit({
      title,
      className,
      maxParticipants,
      questionTimeMs,
      initialDifficulty,
      enableLuckEvents,
      enablePathChoice,
      raceDurationMinutes
    });
  };

  const goBack = () => {
    setStepError("");
    setCurrentStep((step) => Math.max(step - 1, 1));
  };

  const goToStep = (stepId) => {
    setStepError("");
    setCurrentStep(stepId);
  };

  return (
    <section className="create-race" dir="rtl">
      <div className="create-race-hero">
        <div className="create-race-title">
          <h2>{isEditMode ? "עריכת מרוץ" : "יצירת מרוץ חדש"}</h2>
          <p>{isEditMode ? "עדכנו את הגדרות המרוץ וחזרו ללובי כדי לאשר תלמידים." : "עברו שלב-שלב, הגדירו את המרוץ, ובסוף פתחו חדר לתלמידים."}</p>
        </div>
      </div>

      <div className="create-race-summary">
        <div className="race-preview" aria-label="תצוגה מקדימה של המרוץ">
          <strong>סיכום המרוץ</strong>
          <dl className="race-preview-list">
            <div>
              <dt>שם</dt>
              <dd className={title.trim() ? "" : "missing"}>{title.trim() || "חסר שם מרוץ"}</dd>
            </div>
            <div>
              <dt>כיתה</dt>
              <dd className={className.trim() ? "" : "missing"}>{className.trim() || "לא הוגדרה כיתה"}</dd>
            </div>
            <div>
              <dt>משתתפים</dt>
              <dd className={maxParticipants === null ? "missing" : ""}>
                {maxParticipants === null ? "לא נבחר מספר משתתפים" : `עד ${maxParticipants}`}
              </dd>
            </div>
            <div>
              <dt>זמן לשאלה</dt>
              <dd className={questionTimeSeconds === null ? "missing" : ""}>
                {questionTimeSeconds === null ? "לא נבחר זמן לשאלה" : `${questionTimeSeconds} שנ׳ לשאלה`}
              </dd>
            </div>
            <div>
              <dt>זמן מרוץ</dt>
              <dd className={raceDurationMinutes === null ? "missing" : ""}>
                {raceDurationMinutes === null ? "לא נבחר זמן מרוץ" : `${raceDurationMinutes} דק׳`}
              </dd>
            </div>
            <div>
              <dt>רמה</dt>
              <dd className={selectedDifficulty ? "" : "missing"}>{selectedDifficulty?.label || "לא נבחרה רמה"}</dd>
            </div>
          </dl>
        </div>
      </div>

      <form onSubmit={submit} className="create-race-form">
        <div className="create-progress-label">שלב {currentStep} מתוך {steps.length}</div>
        <div className="create-stepper" aria-label="שלבי יצירת המרוץ">
          {steps.map((step) => (
            <button
              key={step.id}
              type="button"
              className={step.id === currentStep ? "create-step active" : step.id < currentStep ? "create-step done" : "create-step"}
              onClick={() => goToStep(step.id)}
            >
              <span>{step.id}</span>
              <strong>{step.title}</strong>
            </button>
          ))}
        </div>
        {stepError ? <p className="create-step-error">{stepError}</p> : null}

        {currentStep === 1 ? (
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
                <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="מרוץ חשבון" required />
              </label>
              <label className="field">
                <span>כיתה</span>
                <input value={className} onChange={(event) => setClassName(event.target.value)} placeholder="לדוגמה: ד׳ 2" />
              </label>
            </div>
          </div>
        ) : null}

        {currentStep === 2 ? (
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
                  <strong>{maxParticipants === null ? "לא נבחר" : maxParticipants}</strong>
                </span>
                <input type="range" min={1} max={8} value={maxParticipants ?? 1} onChange={(event) => {
                  setStepError("");
                  setMaxParticipants(Number(event.target.value));
                }} />
              </label>

              <label className="range-field">
                <span className="range-field-top">
                  <span>זמן לכל שאלה</span>
                  <strong>{questionTimeSeconds === null ? "לא נבחר" : `${questionTimeSeconds} שנ׳`}</strong>
                </span>
                <input type="range" min={5000} max={60000} step={5000} value={questionTimeMs ?? 5000} onChange={(event) => {
                  setStepError("");
                  setQuestionTimeMs(Number(event.target.value));
                }} />
              </label>

              <label className="range-field">
                <span className="range-field-top">
                  <span>משך מרוץ</span>
                  <strong>{raceDurationMinutes === null ? "לא נבחר" : `${raceDurationMinutes} דק׳`}</strong>
                </span>
                <input type="range" min={5} max={120} step={5} value={raceDurationMinutes ?? 5} onChange={(event) => {
                  setStepError("");
                  setRaceDurationMinutes(Number(event.target.value));
                }} />
              </label>
            </div>
          </div>
        ) : null}

        {currentStep === 3 ? (
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
                  onClick={() => {
                    setStepError("");
                    setInitialDifficulty(option.value);
                  }}
                  role="radio"
                  aria-checked={initialDifficulty === option.value}
                >
                  <span>{option.label}</span>
                  <small>{option.hint}</small>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {currentStep === 4 ? (
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
                <input type="checkbox" checked={enableLuckEvents} onChange={(event) => setEnableLuckEvents(event.target.checked)} />
                <span className="toggle-control" aria-hidden="true"></span>
                <span>
                  <strong>אירועי מזל</strong>
                  <small>בונוסים והפתעות במהלך המרוץ</small>
                </span>
              </label>

              <label className="feature-toggle">
                <input type="checkbox" checked={enablePathChoice} onChange={(event) => setEnablePathChoice(event.target.checked)} />
                <span className="toggle-control" aria-hidden="true"></span>
                <span>
                  <strong>בחירת מסלול</strong>
                  <small>אוטוסטרדה או דרך עפר ברגעי החלטה</small>
                </span>
              </label>
            </div>
          </div>
        ) : null}

        <div className="create-race-actions">
          <button type="button" className="ghost create-cancel" onClick={currentStep === 1 ? onCancel : goBack}>
            {currentStep === 1 ? "ביטול" : "חזרה"}
          </button>
          <button type="submit" className="create-submit">
            {isLastStep ? (isEditMode ? "שמור שינויים" : "צור חדר") : "המשך"}
          </button>
        </div>
      </form>
    </section>
  );
}
