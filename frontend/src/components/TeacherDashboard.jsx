const statusLabels = {
  DRAFT: "טיוטה",
  LOBBY: "ממתין לתלמידים",
  LOCKED: "החדר מלא",
  RUNNING: "פעיל",
  PAUSED: "מושהה",
  FINISHED: "הסתיים",
  CANCELLED: "בוטל"
};

export function TeacherDashboard({ rooms, lastCreatedRoomCode, openingRoomCode, errorMessage, onCreateRace, onOpenRoom }) {
  const activeRooms = rooms.filter((room) => ["LOBBY", "LOCKED", "RUNNING", "PAUSED"].includes(room.status)).length;
  const totalParticipants = rooms.reduce((sum, room) => sum + Number(room.participants || 0), 0);
  const pendingParticipants = rooms.reduce((sum, room) => sum + Number(room.pendingParticipants || 0), 0);

  return (
    <section className="teacher-dashboard" dir="rtl">
      <div className="teacher-dashboard-hero">
        <div className="teacher-dashboard-copy">
          <h2>דשבורד מורה</h2>
          <p>
            כאן אפשר ליצור מרוץ חדש, לפתוח חדר קיים, לאשר תלמידים ולעקוב אחרי ההתקדמות בזמן אמת.
          </p>
        </div>

        <button type="button" className="dashboard-create-button" onClick={onCreateRace}>
          <span className="create-button-icon" aria-hidden="true">
            <span></span>
          </span>
          <span className="create-button-copy">
            <strong>יצירת מרוץ חדש</strong>
          </span>
        </button>
      </div>

      <div className="dashboard-stats" aria-label="סיכום פעילות">
        <div className="dashboard-stat">
          <span>חדרים</span>
          <strong>{rooms.length}</strong>
        </div>
        <div className="dashboard-stat">
          <span>חדרים פעילים</span>
          <strong>{activeRooms}</strong>
        </div>
        <div className="dashboard-stat">
          <span>משתתפים</span>
          <strong>{totalParticipants}</strong>
        </div>
        <div className="dashboard-stat">
          <span>ממתינים לאישור</span>
          <strong>{pendingParticipants}</strong>
        </div>
      </div>

      {errorMessage ? <p className="dashboard-error">{errorMessage}</p> : null}

      {rooms.length === 0 ? (
        <div className="dashboard-empty">
          <h3>עדיין אין מרוצים</h3>
          <p>צרו מרוץ ראשון כדי לפתוח חדר לתלמידים ולהתחיל פעילות בכיתה.</p>
        </div>
      ) : (
        <div className="dashboard-room-grid">
          {rooms.map((room) => (
            <article
              key={room.roomCode}
              className={room.roomCode === lastCreatedRoomCode ? "dashboard-room-card is-new" : "dashboard-room-card"}
            >
              <span className="room-card-status">
                {Number(room.pendingParticipants || 0) > 0
                  ? `${room.pendingParticipants} ממתינים לאישור`
                  : room.roomCode === lastCreatedRoomCode
                    ? "חדש"
                    : statusLabels[room.status] || room.status}
              </span>
              <strong>{room.title}</strong>
              <span className="room-card-code">קוד חדר: {room.roomCode}</span>
              <span className="room-card-meta">
                משתתפים: {room.participants || 0}
                {Number(room.approvedParticipants || 0) > 0 ? ` | מאושרים: ${room.approvedParticipants}` : ""}
              </span>
              <button
                type="button"
                className="room-card-action"
                onClick={() => onOpenRoom(room.roomCode)}
                disabled={openingRoomCode === room.roomCode}
              >
                {openingRoomCode === room.roomCode ? "פותח..." : "ניהול מרוץ"}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
