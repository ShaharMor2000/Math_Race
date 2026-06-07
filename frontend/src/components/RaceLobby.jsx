import { useState } from "react";

export function RaceLobby({
  roomCode,
  roomStatus,
  participants,
  onApproveParticipant,
  onRejectParticipant,
  onAddStudent,
  onStartRace
}) {
  const [newStudentName, setNewStudentName] = useState("");
  const pending = participants.filter((p) => p.participantStatus === "PENDING");
  const approved = participants.filter((p) => p.participantStatus === "ACTIVE");

  const addStudent = async (event) => {
    event.preventDefault();
    if (!newStudentName.trim()) return;
    await onAddStudent(newStudentName.trim());
    setNewStudentName("");
  };

  return (
    <section className="card">
      <h2>לובי מרוץ</h2>
      <p className="room-code-large">קוד חדר: {roomCode}</p>
      {roomStatus === "LOCKED" ? <p className="locked-banner">החדר ננעל — הגיע למכסת המשתתפים</p> : null}

      <form onSubmit={addStudent} className="row add-student-form">
        <input
          value={newStudentName}
          onChange={(e) => setNewStudentName(e.target.value)}
          placeholder="הוסף תלמיד לרוסטר"
        />
        <button type="submit">הוסף</button>
      </form>

      <h3>ממתינים לאישור ({pending.length})</h3>
      {pending.length === 0 ? <p>אין תלמידים ממתינים כרגע.</p> : null}
      <div className="stack">
        {pending.map((p) => (
          <div key={p.participantId} className="row between participant-row">
            <span>{p.displayName}</span>
            <span>מסלול {p.laneNo}</span>
            <span style={{ color: p.carColor }}>{p.carColor}</span>
            <div className="row">
              <button type="button" onClick={() => void onApproveParticipant(p.participantId)}>
                אשר
              </button>
              <button type="button" className="ghost" onClick={() => void onRejectParticipant(p.participantId)}>
                דחה
              </button>
            </div>
          </div>
        ))}
      </div>

      <h3>מאושרים למרוץ ({approved.length})</h3>
      {approved.length === 0 ? <p>עדיין אין תלמידים מאושרים.</p> : null}
      <div className="stack">
        {approved.map((p) => (
          <div key={p.participantId} className="row between participant-row">
            <span>{p.displayName}</span>
            <span>מסלול {p.laneNo}</span>
            <span style={{ color: p.carColor }}>{p.carColor}</span>
            <span className="status-pill">מאושר</span>
          </div>
        ))}
      </div>

      <button onClick={onStartRace} disabled={approved.length < 1}>
        התחל מרוץ
      </button>
    </section>
  );
}
