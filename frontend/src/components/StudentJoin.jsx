import { useState } from "react";
import { Button, Card, Field, Input } from "./ui/Primitives";

export function StudentJoin({ openRaces = [], onJoin, onRefresh, email: controlledEmail = "", onEmailChange }) {
  const [roomCode, setRoomCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmailState] = useState(controlledEmail);
  const [submittingCode, setSubmittingCode] = useState(false);
  const [submittingRoomCode, setSubmittingRoomCode] = useState(null);

  const canSubmit = displayName.trim().length > 0 && email.trim().length > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmittingCode(true);
    try {
      await onJoin(roomCode.toUpperCase(), displayName.trim(), email.trim());
    } finally {
      setSubmittingCode(false);
    }
  };

  const joinOpenRace = async (selectedRoomCode) => {
    if (!canSubmit) return;
    setSubmittingRoomCode(selectedRoomCode);
    try {
      await onJoin(selectedRoomCode, displayName.trim(), email.trim());
    } finally {
      setSubmittingRoomCode(null);
    }
  };

  const updateEmail = (nextEmail) => {

    setEmailState(nextEmail);

    onEmailChange?.(nextEmail);

  };

  return (
    <Card className="centered student-join-card">
      <p className="page-kicker">הצטרפות</p>
      <h2>רישום תלמיד למרוץ</h2>
      <p className="page-subtitle">בחרו מרוץ פתוח או הזינו קוד חדר. ההרשמה ממתינה לאישור המורה.</p>

      <div className="stack join-form-stack">
        <Field label="שם תלמיד">
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="לדוגמה: יואב כהן" required />
        </Field>
        <Field label="מייל תלמיד">
          <Input type="email" value={email} onChange={(e) => updateEmail(e.target.value)} placeholder="student@school.com" required />
        </Field>

        <div className="join-section-head">
          <strong>מרוצים פתוחים</strong>
          <Button variant="ghost" size="sm" onClick={onRefresh}>רענון</Button>
        </div>

        {openRaces.length === 0 ? <p className="muted">אין כרגע מרוצים פתוחים להרשמה.</p> : null}
        <div className="open-race-list">
          {openRaces.map((race) => (
            <div key={race.roomCode} className="open-race-row premium-open-race">
              <div>
                <strong>{race.title}</strong>
                <p className="muted">
                  קוד: {race.roomCode} · רשומים: {race.registeredCount}/{race.maxParticipants}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => void joinOpenRace(race.roomCode)}
                disabled={!canSubmit || submittingRoomCode === race.roomCode}
              >
                {submittingRoomCode === race.roomCode ? "נרשם..." : "הירשם"}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <hr className="separator" />

      <form onSubmit={submit} className="stack join-form-stack">
        <strong>הצטרפות לפי קוד חדר</strong>
        <Field label="קוד חדר">
          <Input value={roomCode} onChange={(e) => setRoomCode(e.target.value)} placeholder="ABCDEF" required />
        </Field>
        <Button type="submit" disabled={!canSubmit || submittingCode}>
          {submittingCode ? "נרשם..." : "הצטרף למרוץ"}
        </Button>
      </form>
    </Card>
  );
}

