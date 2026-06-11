import { useState } from "react";
import { DocNote } from "./DocNote";

export function StudentJoin({ openRaces = [], onJoin, onRefresh, onDashboardLogin }) {
  const [roomCode, setRoomCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
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

  const openDashboard = async () => {
    if (!email.trim()) return;
    await onDashboardLogin(email.trim());
  };

  return (
    <section className="card centered">
      <h2>רישום תלמיד למרוץ</h2>
      <DocNote
        title="Student Join Page"
        text="Students can see open race rooms and register with their display name. Registration waits for teacher approval before the race starts."
      />
      <div className="stack">
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="שם תלמיד"
          required
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="מייל תלמיד"
          required
        />
        <div className="row between">
          <strong>מרוצים פתוחים</strong>
          <button type="button" className="ghost" onClick={onRefresh}>
            רענון
          </button>
        </div>
        {openRaces.length === 0 ? <p>אין כרגע מרוצים פתוחים להרשמה.</p> : null}
        {openRaces.map((race) => (
          <div key={race.roomCode} className="open-race-row">
            <div>
              <strong>{race.title}</strong>
              <p className="muted">
                קוד: {race.roomCode} | רשומים: {race.registeredCount}/{race.maxParticipants}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void joinOpenRace(race.roomCode)}
              disabled={!canSubmit || submittingRoomCode === race.roomCode}
            >
              {submittingRoomCode === race.roomCode ? "נרשם..." : "הירשם"}
            </button>
          </div>
        ))}
      </div>

      <hr className="separator" />
      <form onSubmit={submit} className="stack">
        <strong>או הצטרפות לפי קוד חדר</strong>
        <input
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          placeholder="קוד חדר"
          required
        />
        <button type="submit" disabled={!canSubmit || submittingCode}>
          {submittingCode ? "נרשם..." : "הצטרף למרוץ"}
        </button>
        <button type="button" className="ghost" disabled={!email.trim()} onClick={() => void openDashboard()}>
          כניסה לדשבורד שלי
        </button>
      </form>
    </section>
  );
}
