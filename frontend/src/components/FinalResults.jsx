import { Button, Card } from "./ui/Primitives";

function sameResult(a, b) {
  return (
    Number(a?.finalProgress || 0) === Number(b?.finalProgress || 0) &&
    Number(a?.finalScore || 0) === Number(b?.finalScore || 0)
  );
}

function medalForRank(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "🏁";
}

export function FinalResults({ rows, winnerName, onReset }) {
  const sortedRows = [...rows].sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (b.finalProgress !== a.finalProgress) return b.finalProgress - a.finalProgress;
    return b.finalScore - a.finalScore;
  });
  const topRows = sortedRows.filter((row) => sameResult(row, sortedRows[0]));
  const isTie = topRows.length > 1 || winnerName === "שוויון";
  const podium = sortedRows.filter((row) => row.rank <= 3);
  const rest = sortedRows.filter((row) => row.rank > 3);

  return (
    <Card className="final-results premium-results">
      <div className="final-results-hero">
        <p className="page-kicker">סיום מרוץ</p>
        <h2>תוצאות סופיות</h2>
        {isTie ? (
          <p className="winner-banner">שוויון: {topRows.map((row) => row.displayName).join(" ו-")}</p>
        ) : winnerName ? (
          <p className="winner-banner">🏆 המנצח: {winnerName}</p>
        ) : null}
      </div>

      {podium.length > 0 ? (
        <div className="podium podium-premium">
          {podium.map((row) => (
            <div key={`${row.rank}-${row.displayName}`} className={`podium-place place-${row.rank}`}>
              <div className="podium-medal">{medalForRank(row.rank)}</div>
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
