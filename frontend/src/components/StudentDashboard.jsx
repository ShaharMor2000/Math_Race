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
  openRaces = [],
  loading,
  errorMessage,
  activeRoomCode,
  activeParticipantStatus,
  onRefresh,
  onJoinOpenRace,
  onEnterRace,
  onFindRace,
  onLogout
}) {
  const registeredRoomCodes = new Set(races.map((race) => race.roomCode));
  const availableOpenRaces = openRaces.filter((race) => !registeredRoomCodes.has(race.roomCode));
  const totalRaces = races.length + availableOpenRaces.length;
  const registeredRacesCount = races.length;
  const finishedRaces = races.filter((race) => race.raceStatus === "FINISHED").length;
  const bestScore = races.reduce((best, race) => Math.max(best, Number(race.scoreTotal || 0)), 0);
  const avgProgress = registeredRacesCount
    ? Math.round(races.reduce((sum, race) => sum + Number(race.progressPoints || 0), 0) / registeredRacesCount)
    : 0;

  const activeRace = activeRoomCode ? races.find((race) => race.roomCode === activeRoomCode) : null;
  const showEmptyState = races.length === 0 && availableOpenRaces.length === 0 && !loading;

  return (
    <section className="student-dashboard" dir="rtl">
      <PageHeader kicker="תלמיד" title="דשבורד תלמיד" subtitle={email} />

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

      {availableOpenRaces.length > 0 ? (
        <div className="student-open-races">
          <div className="join-section-head">
            <strong>מרוצים פתוחים להרשמה</strong>
            <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading}>
              {loading ? "מרענן..." : "רענון"}
            </Button>
          </div>
          <div className="open-race-list">
            {availableOpenRaces.map((race) => (
              <Card key={race.roomCode} className="open-race-row premium-open-race">
                <div>
                  <Badge variant="default">{raceStatusLabels[race.status] || race.status}</Badge>
                  <h3>{race.title}</h3>
                  <p className="muted">
                    קוד: {race.roomCode} · רשומים: {race.registeredCount}/{race.maxParticipants}
                  </p>
                </div>
                <Button size="sm" onClick={() => onJoinOpenRace?.(race.roomCode)}>
                  הרשמה למרוץ
                </Button>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {showEmptyState ? (
        <EmptyState
          title="עדיין אין מרוצים"
          description="כשמורה יפתח מרוץ חדש הוא יופיע כאן, ותוכלו להירשם אליו."
          action={<Button onClick={onFindRace}>מצא מרוץ להצטרפות</Button>}
        />
      ) : null}

      <div className="student-race-list">
        {races.map((race) => {
          const progressPct = Math.min(100, Math.max(0, Math.round((Number(race.progressPoints || 0) / 1000) * 100)));
          const totalAnswers = Number(race.correctCount || 0) + Number(race.wrongCount || 0);
          const accuracy = totalAnswers ? Math.round((Number(race.correctCount || 0) / totalAnswers) * 100) : 0;
          const canEnterRace =
            race.participantStatus === "ACTIVE" &&
            !["FINISHED", "CANCELLED"].includes(race.raceStatus);
          const enterRaceLabel =
            race.raceStatus === "RUNNING" || race.raceStatus === "PAUSED"
              ? "כניסה למרוץ"
              : "כניסה לחדר";

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
              {canEnterRace ? (
                <Button onClick={() => onEnterRace?.(race.roomCode)}>
                  {enterRaceLabel}
                </Button>
              ) : null}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
