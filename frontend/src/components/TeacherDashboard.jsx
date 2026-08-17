import { useState } from "react";
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

const ACTIVE_STATUSES = ["LOBBY", "LOCKED", "RUNNING", "PAUSED"];
const FINISHED_STATUSES = ["FINISHED", "CANCELLED"];

const ROOM_FILTERS = [
  { id: "all", label: "הכל" },
  { id: "active", label: "פעילים" },
  { id: "finished", label: "הסתיימו" }
];

function matchesRoomFilter(room, filter) {
  if (filter === "active") return ACTIVE_STATUSES.includes(room.status);
  if (filter === "finished") return FINISHED_STATUSES.includes(room.status);
  return true;
}

export function TeacherDashboard({
  rooms,
  lastCreatedRoomCode,
  openingRoomCode,
  removingRoomCode,
  errorMessage,
  onCreateRace,
  onOpenRoom,
  onRemoveRoom
}) {
  const [roomFilter, setRoomFilter] = useState("all");

  const activeRooms = rooms.filter((room) => ACTIVE_STATUSES.includes(room.status)).length;
  const pendingParticipants = rooms.reduce((sum, room) => sum + Number(room.pendingParticipants || 0), 0);
  const filteredRooms = rooms
    .filter((room) => matchesRoomFilter(room, roomFilter))
    .map((room) => (room.status === "RUNNING" ? { ...room, approvedParticipants: 0 } : room));

  const emptyCopy = {
    all: {
      title: "עדיין אין מרוצים",
      description: "צרו מרוץ ראשון כדי לפתוח חדר לתלמידים ולהתחיל פעילות בכיתה."
    },
    active: {
      title: "אין חדרים פעילים",
      description: "אין כרגע חדרים במצב לובי, פעיל או מושהה."
    },
    finished: {
      title: "אין חדרים שהסתיימו",
      description: "כשמרוץ יסתיים, הוא יופיע כאן."
    }
  }[roomFilter];

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
        <StatCard label="ממתינים לאישור" value={pendingParticipants} />
      </div>

      {errorMessage ? <p className="dashboard-error">{errorMessage}</p> : null}

      <div className="dashboard-section-head">
        <div>
          <h3>החדרים שלי</h3>
          <p>בחרו מה להציג: כל החדרים, רק פעילים או רק כאלה שהסתיימו.</p>
        </div>
        <div className="dashboard-room-filters" role="tablist" aria-label="סינון חדרים">
          {ROOM_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={roomFilter === filter.id}
              className={roomFilter === filter.id ? "dashboard-room-filter active" : "dashboard-room-filter"}
              onClick={() => setRoomFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {rooms.length === 0 ? (
        <EmptyState
          title="עדיין אין מרוצים"
          description="צרו מרוץ ראשון כדי לפתוח חדר לתלמידים ולהתחיל פעילות בכיתה."
          action={<Button onClick={onCreateRace}>יצירת מרוץ ראשון</Button>}
        />
      ) : filteredRooms.length === 0 ? (
        <EmptyState title={emptyCopy.title} description={emptyCopy.description} />
      ) : (
        <div className="dashboard-room-grid">
          {filteredRooms.map((room) => (
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
              <div className="room-card-actions">
                <Button
                  className="room-card-action-btn"
                  size="sm"
                  onClick={() => onOpenRoom(room.roomCode)}
                  disabled={openingRoomCode === room.roomCode || removingRoomCode === room.roomCode}
                >
                  {openingRoomCode === room.roomCode
                    ? "פותח..."
                    : FINISHED_STATUSES.includes(room.status)
                      ? "תצוגת מידע"
                      : "ניהול מרוץ"}
                </Button>
                <Button
                  className="room-card-action-btn"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveRoom?.(room)}
                  disabled={openingRoomCode === room.roomCode || removingRoomCode === room.roomCode}
                >
                  {removingRoomCode === room.roomCode ? "מסיר..." : "הסר"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
