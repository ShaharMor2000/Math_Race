const MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };

export function Leaderboard({ rows }) {
  return (
    <section className="leaderboard-premium card">
      <div className="leaderboard-header">
        <h3>לוח מובילים</h3>
        <span className="muted">{rows.length} מתחרים</span>
      </div>
      <div className="leaderboard-list">
        {rows.map((row) => (
          <div key={row.participantId} className={`leaderboard-row rank-${row.rank}`}>
            <div className="leaderboard-rank">
              {MEDALS[row.rank] ? <span className="leaderboard-medal">{MEDALS[row.rank]}</span> : null}
              <strong>#{row.rank}</strong>
            </div>
            <div className="leaderboard-body">
              <div className="leaderboard-top">
                <span className="leaderboard-name">{row.displayName}</span>
                <span className="leaderboard-points">{row.progress} / 1000</span>
              </div>
              <div className="leaderboard-bar">
                <div className="leaderboard-bar-fill" style={{ width: `${Math.min(100, (row.progress / 1000) * 100)}%` }} />
              </div>
              <div className="leaderboard-meta">
                <span>ניקוד {row.score}</span>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 ? <p className="muted">אין נתונים עדיין</p> : null}
      </div>
    </section>
  );
}
