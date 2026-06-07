export function FinalResults({ rows, winnerName, onReset }) {
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <section className="card final-results">
      <h2>תוצאות סופיות</h2>
      {winnerName ? <p className="winner-banner">המנצח: {winnerName}</p> : null}

      {podium.length > 0 ? (
        <div className="podium">
          {podium.map((row) => (
            <div key={`${row.rank}-${row.displayName}`} className={`podium-place place-${row.rank}`}>
              <div className="podium-rank">#{row.rank}</div>
              <strong>{row.displayName}</strong>
              <span>{row.finalProgress} נק׳</span>
              <span>{row.finalScore} ניקוד</span>
              <span>{row.accuracyPct}% דיוק</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="stack">
        {rest.map((row) => (
          <div className="row between leaderboard-row" key={`${row.rank}-${row.displayName}`}>
            <strong>#{row.rank}</strong>
            <span>{row.displayName}</span>
            <span>התקדמות: {row.finalProgress}</span>
            <span>ניקוד: {row.finalScore}</span>
            <span>דיוק: {row.accuracyPct}%</span>
            {row.avgResponseMs ? <span>זמן ממוצע: {row.avgResponseMs}ms</span> : null}
            {row.totalEvents != null ? <span>אירועים: {row.totalEvents}</span> : null}
          </div>
        ))}
      </div>
      <button onClick={onReset}>מרוץ חדש</button>
    </section>
  );
}
