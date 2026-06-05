import { DocNote } from "./DocNote";

export function TeacherDashboard({ rooms, onCreateRace, onOpenRoom }) {
  return (
    <section className="card">
      <div className="row between">
        <h2>דשבורד מורה</h2>
        <button onClick={onCreateRace}>יצירת מרוץ חדש</button>
      </div>

      <DocNote
        title="Teacher Dashboard"
        text="This dashboard shows all teacher race rooms and statuses. Open any room to manage its lobby, start the race, and monitor live progress."
      />

      <div className="stack">
        {rooms.length === 0 ? (
          <p>אין חדרים עדיין.</p>
        ) : (
          rooms.map((room) => (
            <button key={room.roomCode} className="room-item" onClick={() => onOpenRoom(room.roomCode)}>
              <strong>{room.title}</strong>
              <span>קוד: {room.roomCode}</span>
              <span>סטטוס: {room.status}</span>
              <span>משתתפים: {room.participants}</span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
