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

  const activeRace = activeRoomCode
    ? races.find((race) => race.roomCode === activeRoomCode)
    : null;

  return (
    <section className="student-dashboard" dir="rtl">
      <div className="student-dashboard-head">
        <div>
          <h2>דשבורד תלמיד</h2>
          <p>{email}</p>
        </div>
        <div className="row">
          <button type="button" className="ghost" onClick={onFindRace}>
            הרשמה למרוץ
          </button>
          <button type="button" className="ghost" onClick={onRefresh} disabled={loading}>
            {loading ? "מרענן..." : "רענון"}
          </button>
          <button type="button" className="ghost" onClick={onLogout}>
            יציאה
          </button>
        </div>
      </div>

      {errorMessage ? <p className="dashboard-error">{errorMessage}</p> : null}

      <div className="student-stats">
        <div className="dashboard-stat">
          <span>מרוצים</span>
          <strong>{totalRaces}</strong>
        </div>
        <div className="dashboard-stat">
          <span>הסתיימו</span>
          <strong>{finishedRaces}</strong>
        </div>
        <div className="dashboard-stat">
          <span>שיא ניקוד</span>
          <strong>{bestScore}</strong>
        </div>
        <div className="dashboard-stat">
          <span>התקדמות ממוצעת</span>
          <strong>{avgProgress}/1000</strong>
        </div>
      </div>

      {activeRace ? (
        <div className="card student-current-race">
          <div>
            <span className="room-card-status">{participantStatusLabels[activeParticipantStatus] || activeParticipantStatus}</span>
            <h3>{activeRace.title}</h3>
            <p>קוד חדר: {activeRace.roomCode}</p>
          </div>
          <button type="button" onClick={onEnterRace} disabled={activeParticipantStatus !== "ACTIVE"}>
            {activeParticipantStatus === "ACTIVE" ? "כניסה למרוץ" : "ממתין לאישור"}
          </button>
        </div>
      ) : null}

      {races.length === 0 && !loading ? (
        <div className="dashboard-empty">
          <h3>עדיין אין מרוצים</h3>
          <p>הירשמו למרוץ עם המייל הזה, והוא יופיע כאן עם דוח התקדמות.</p>
        </div>
      ) : null}

      <div className="student-race-list">
        {races.map((race) => {
          const progressPct = Math.min(100, Math.max(0, Math.round((Number(race.progressPoints || 0) / 1000) * 100)));
          const totalAnswers = Number(race.correctCount || 0) + Number(race.wrongCount || 0);
          const accuracy = totalAnswers ? Math.round((Number(race.correctCount || 0) / totalAnswers) * 100) : 0;

          return (
            <article key={`${race.roomCode}-${race.joinedAt}`} className="student-race-card">
              <div className="student-race-card-head">
                <div>
                  <span className="room-card-status">{raceStatusLabels[race.raceStatus] || race.raceStatus}</span>
                  <h3>{race.title}</h3>
                  <p>קוד חדר: {race.roomCode}</p>
                </div>
                <strong>{race.scoreTotal || 0} נק׳</strong>
              </div>

              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progressPct}%` }} />
              </div>

              <div className="student-report-grid">
                <span>התקדמות: {race.progressPoints || 0}/1000</span>
                <span>סטטוס: {participantStatusLabels[race.participantStatus] || race.participantStatus}</span>
                <span>נכונות: {accuracy}%</span>
                <span>נכונות/טעויות: {race.correctCount || 0}/{race.wrongCount || 0}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
