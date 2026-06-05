export function Leaderboard({ rows }) {
  return (
    <section className="card">
      <h3>לוח מובילים</h3>
      <div className="stack">
        {rows.map((row) => (
          <div key={row.participantId} className="row between leaderboard-row">
            <strong>#{row.rank}</strong>
            <span>{row.displayName}</span>
            <span>{row.progress}</span>
            <span>{row.score}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
