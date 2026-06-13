import { Button, Card } from "./ui/Primitives";

export function FinalResults({ rows, winnerName, onReset }) {
  const first = rows.find((r) => r.rank === 1);
  const second = rows.find((r) => r.rank === 2);
  const third = rows.find((r) => r.rank === 3);
  const podium = [second, first, third].filter(Boolean);
  const rest = rows.filter((r) => r.rank > 3);

  return (
    <Card className="final-results premium-results">
      <div className="final-results-hero">
        <p className="page-kicker">סיום מרוץ</p>
        <h2>תוצאות סופיות</h2>
        {winnerName ? <p className="winner-banner">🏆 המנצח: {winnerName}</p> : null}
      </div>

      {podium.length > 0 ? (
        <div className="podium podium-premium">
          {podium.map((row) => (
            <div key={`${row.rank}-${row.displayName}`} className={`podium-place place-${row.rank}`}>
              <div className="podium-medal">{row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : "🥉"}</div>
              <div className="podium-rank">#{row.rank}</div>
              <strong>{row.displayName}</strong>
              <span>{row.finalProgress} התקדמות</span>
              <span>{row.finalScore} ניקוד</span>
              <span>{row.accuracyPct}% דיוק</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="results-table">
        {rest.map((row) => (
          <div className="results-row" key={`${row.rank}-${row.displayName}`}>
            <strong>#{row.rank}</strong>
            <span>{row.displayName}</span>
            <span>{row.finalProgress}</span>
            <span>{row.finalScore}</span>
            <span>{row.accuracyPct}%</span>
          </div>
        ))}
      </div>
      <Button className="primary-btn" onClick={onReset}>חזרה / מרוץ חדש</Button>
    </Card>
  );
}
