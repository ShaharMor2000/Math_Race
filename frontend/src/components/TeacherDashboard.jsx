import { Badge, Button, EmptyState, PageHeader, StatCard } from "./ui/Primitives";

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
      <PageHeader
        kicker="מרוץ חשבון"
        title="דשבורד מורה"
        subtitle="צרו מרוץ חדש, נהלו חדרים, אשרו תלמידים ועקבו אחרי ההתקדמות בזמן אמת."
        actions={
          <button type="button" className="dashboard-create-button" onClick={onCreateRace}>
            <span className="create-button-icon" aria-hidden="true">
              <span></span>
            </span>
            <span className="create-button-copy">
              <strong>יצירת מרוץ חדש</strong>
            </span>
          </button>
        }
      />

      <div className="dashboard-stats" aria-label="סיכום פעילות">
        <StatCard label="חדרים" value={rooms.length} />
        <StatCard label="חדרים פעילים" value={activeRooms} />
        <StatCard label="משתתפים" value={totalParticipants} />
        <StatCard label="ממתינים לאישור" value={pendingParticipants} />
      </div>

      {errorMessage ? <p className="dashboard-error">{errorMessage}</p> : null}

      {rooms.length === 0 ? (
        <EmptyState
          title="עדיין אין מרוצים"
          description="צרו מרוץ ראשון כדי לפתוח חדר לתלמידים ולהתחיל פעילות בכיתה."
          action={<Button onClick={onCreateRace}>יצירת מרוץ ראשון</Button>}
        />
      ) : (
        <div className="dashboard-room-grid">
          {rooms.map((room) => (
            <article
              key={room.roomCode}
              className={room.roomCode === lastCreatedRoomCode ? "dashboard-room-card is-new" : "dashboard-room-card"}
            >
              <Badge variant={Number(room.pendingParticipants || 0) > 0 ? "warning" : room.roomCode === lastCreatedRoomCode ? "success" : "default"}>
                {Number(room.pendingParticipants || 0) > 0
                  ? `${room.pendingParticipants} ממתינים`
                  : room.roomCode === lastCreatedRoomCode
                    ? "חדש"
                    : statusLabels[room.status] || room.status}
              </Badge>
              <strong>{room.title}</strong>
              <span className="room-card-code">קוד: {room.roomCode}</span>
              <span className="room-card-meta">
                משתתפים: {room.participants || 0}
                {Number(room.approvedParticipants || 0) > 0 ? ` · מאושרים: ${room.approvedParticipants}` : ""}
              </span>
              <Button
                className="room-card-action-btn"
                size="sm"
                onClick={() => onOpenRoom(room.roomCode)}
                disabled={openingRoomCode === room.roomCode}
              >
                {openingRoomCode === room.roomCode ? "פותח..." : "ניהול מרוץ"}
              </Button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
