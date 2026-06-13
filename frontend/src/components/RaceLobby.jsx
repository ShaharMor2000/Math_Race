import { useState } from "react";
import { Badge, Button, Card, Input, PageHeader } from "./ui/Primitives";

export function RaceLobby({
  roomCode,
  roomStatus,
  participants,
  onApproveParticipant,
  onRejectParticipant,
  onAddStudent,
  onStartRace,
  onBack,
  onEditRace
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
    <section className="lobby-screen">
      <PageHeader
        kicker="ניהול מרוץ"
        title="לובי מרוץ"
        subtitle="אשרו תלמידים, הוסיפו משתתפים והתחילו כשהכיתה מוכנה."
        badge={<Badge variant={roomStatus === "LOCKED" ? "warning" : "success"}>{roomStatus === "LOCKED" ? "החדר מלא" : "פתוח להרשמה"}</Badge>}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={onBack}>חזרה</Button>
            <Button variant="ghost" size="sm" onClick={onEditRace}>עריכה</Button>
            <Button onClick={onStartRace} disabled={approved.length < 1}>התחל מרוץ</Button>
          </>
        }
      />

      <Card className="lobby-room-card">
        <p className="page-kicker">קוד חדר</p>
        <p className="room-code-display">{roomCode}</p>
        <p className="muted">שתפו את הקוד או לינק ההצטרפות עם התלמידים</p>
      </Card>

      {roomStatus === "LOCKED" ? (
        <div className="banner banner-warning">החדר ננעל — הגיע למכסת המשתתפים</div>
      ) : null}

      <Card className="lobby-add-form">
        <h3>הוספת תלמיד לרוסטר</h3>
        <form onSubmit={addStudent} className="lobby-add-row">
          <Input
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
            placeholder="שם תלמיד"
          />
          <Button type="submit">הוסף</Button>
        </form>
      </Card>

      <div className="lobby-columns">
        <Card className="lobby-panel">
          <div className="lobby-panel-head">
            <h3>ממתינים לאישור</h3>
            <Badge variant="warning">{pending.length}</Badge>
          </div>
          {pending.length === 0 ? <p className="muted">אין תלמידים ממתינים כרגע.</p> : null}
          <div className="participant-list">
            {pending.map((p) => (
              <article key={p.participantId} className="participant-item">
                <div className="participant-main">
                  <span className="participant-avatar" style={{ background: p.carColor }} aria-hidden="true">🚗</span>
                  <div className="participant-identity">
                    <strong>{p.displayName}</strong>
                    <small>{p.email || "לא הוזן מייל"}</small>
                  </div>
                </div>
                <div className="participant-meta">
                  <span className="muted">מסלול {p.laneNo}</span>
                  <div className="participant-actions">
                    <Button size="sm" onClick={() => void onApproveParticipant(p.participantId)}>אשר</Button>
                    <Button variant="ghost" size="sm" onClick={() => void onRejectParticipant(p.participantId)}>דחה</Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Card>

        <Card className="lobby-panel">
          <div className="lobby-panel-head">
            <h3>מאושרים למרוץ</h3>
            <Badge variant="success">{approved.length}</Badge>
          </div>
          {approved.length === 0 ? <p className="muted">עדיין אין תלמידים מאושרים.</p> : null}
          <div className="participant-list">
            {approved.map((p) => (
              <article key={p.participantId} className="participant-item">
                <div className="participant-main">
                  <span className="participant-avatar" style={{ background: p.carColor }} aria-hidden="true">🏎️</span>
                  <div className="participant-identity">
                    <strong>{p.displayName}</strong>
                    <small>{p.email || "לא הוזן מייל"}</small>
                  </div>
                </div>
                <div className="participant-meta">
                  <span className="muted">מסלול {p.laneNo}</span>
                  <Badge variant="success">מאושר</Badge>
                </div>
              </article>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
