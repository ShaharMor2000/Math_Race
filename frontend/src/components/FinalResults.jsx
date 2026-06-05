import { DocNote } from "./DocNote";

export function FinalResults({ rows, onReset }) {
  return (
    <section className="card">
      <h2>תוצאות סופיות</h2>
      <DocNote
        title="Final Results Page"
        text="The race outcome is ranked here with final progress, score, and accuracy. Teachers can use this summary for quick classroom feedback and follow-up."
      />
      <div className="stack">
        {rows.map((row) => (
          <div className="row between leaderboard-row" key={`${row.rank}-${row.displayName}`}>
            <strong>#{row.rank}</strong>
            <span>{row.displayName}</span>
            <span>התקדמות: {row.finalProgress}</span>
            <span>ניקוד: {row.finalScore}</span>
            <span>דיוק: {row.accuracyPct}%</span>
          </div>
        ))}
      </div>
      <button onClick={onReset}>מרוץ חדש</button>
    </section>
  );
}
