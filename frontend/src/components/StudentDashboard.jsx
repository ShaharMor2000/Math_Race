import { Badge, Button, Card, EmptyState, PageHeader, StatCard } from "./ui/Primitives";

const raceStatusLabels = {
  DRAFT: "טיוטה",
  LOBBY: "ממתין להתחלה",
  LOCKED: "החדר מלא",
  RUNNING: "פעיל",
  PAUSED: "מושהה",
  FINISHED: "הסתיים",
  CANCELLED: "בוטל"
};

const participantStatusLabels = {
  PENDING: "ממתין לאישור מורה",
  ACTIVE: "מאושר",
  DISCONNECTED: "מנותק",
  LEFT: "עזב",
  FINISHED: "סיים"
};

export function StudentDashboard({
  email,
  races,
  loading,
  errorMessage,
  activeRoomCode,
  activeParticipantStatus,
  onRefresh,
  onEnterRace,
  onFindRace,
  onLogout
}) {
  const totalRaces = races.length;
  const finishedRaces = races.filter((race) => race.raceStatus === "FINISHED").length;
  const bestScore = races.reduce((best, race) => Math.max(best, Number(race.scoreTotal || 0)), 0);
  const avgProgress = totalRaces
    ? Math.round(races.reduce((sum, race) => sum + Number(race.progressPoints || 0), 0) / totalRaces)
    : 0;

  const activeRace = activeRoomCode ? races.find((race) => race.roomCode === activeRoomCode) : null;

  return (
    <section className="student-dashboard" dir="rtl">
      <PageHeader
        kicker="תלמיד"
        title="דשבורד תלמיד"
        subtitle={email}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={onFindRace}>הרשמה למרוץ</Button>
            <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading}>
              {loading ? "מרענן..." : "רענון"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onLogout}>יציאה</Button>
          </>
        }
      />

      {errorMessage ? <p className="dashboard-error">{errorMessage}</p> : null}

      <div className="student-stats">
        <StatCard label="מרוצים" value={totalRaces} />
        <StatCard label="הסתיימו" value={finishedRaces} />
        <StatCard label="שיא ניקוד" value={bestScore} />
        <StatCard label="התקדמות ממוצעת" value={`${avgProgress}/1000`} />
      </div>

      {activeRace ? (
        <Card className="student-current-race">
          <div>
            <Badge variant={activeParticipantStatus === "ACTIVE" ? "success" : "warning"}>
              {participantStatusLabels[activeParticipantStatus] || activeParticipantStatus}
            </Badge>
            <h3>{activeRace.title}</h3>
            <p className="muted">קוד חדר: {activeRace.roomCode}</p>
          </div>
          <Button onClick={onEnterRace} disabled={activeParticipantStatus !== "ACTIVE"}>
            {activeParticipantStatus === "ACTIVE" ? "כניסה למרוץ" : "ממתין לאישור"}
          </Button>
        </Card>
      ) : null}

      {races.length === 0 && !loading ? (
        <EmptyState
          title="עדיין אין מרוצים"
          description="הירשמו למרוץ עם המייל הזה, והוא יופיע כאן עם דוח התקדמות."
          action={<Button onClick={onFindRace}>מצא מרוץ להצטרפות</Button>}
        />
      ) : null}

      <div className="student-race-list">
        {races.map((race) => {
          const progressPct = Math.min(100, Math.max(0, Math.round((Number(race.progressPoints || 0) / 1000) * 100)));
          const totalAnswers = Number(race.correctCount || 0) + Number(race.wrongCount || 0);
          const accuracy = totalAnswers ? Math.round((Number(race.correctCount || 0) / totalAnswers) * 100) : 0;

          return (
            <Card key={`${race.roomCode}-${race.joinedAt}`} className="student-race-card">
              <div className="student-race-card-head">
                <div>
                  <Badge variant="default">{raceStatusLabels[race.raceStatus] || race.raceStatus}</Badge>
                  <h3>{race.title}</h3>
                  <p className="muted">קוד: {race.roomCode}</p>
                </div>
                <strong className="student-score-pill">{race.scoreTotal || 0} נק׳</strong>
              </div>

              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progressPct}%` }} />
              </div>

              <div className="student-report-grid">
                <span>התקדמות: {race.progressPoints || 0}/1000</span>
                <span>סטטוס: {participantStatusLabels[race.participantStatus] || race.participantStatus}</span>
                <span>דיוק: {accuracy}%</span>
                <span>נכון/טעויות: {race.correctCount || 0}/{race.wrongCount || 0}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
