import { DocNote } from "./DocNote";

export function RaceLobby({ roomCode, participants, onApproveParticipant, onRejectParticipant, onStartRace }) {
  const pending = participants.filter((p) => p.participantStatus === "PENDING");
  const approved = participants.filter((p) => p.participantStatus === "ACTIVE");

  return (
    <section className="card">
      <h2>לובי מרוץ</h2>
      <DocNote
        title="Race Lobby Page"
        text="Students register before the race starts. The teacher approves registrations, rejects invalid entries, and starts the race with approved participants."
      />
      <p className="room-code">קוד חדר: {roomCode}</p>

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
