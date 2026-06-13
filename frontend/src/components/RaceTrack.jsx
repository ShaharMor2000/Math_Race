const CAR_ICONS = ["🚗", "🏎️", "🚙", "🛻", "🚕", "🚓", "🏁", "🚘"];

export function RaceTrack({ participants }) {
  const sorted = [...participants].sort((a, b) => b.progressPoints - a.progressPoints);

  return (
    <section className="race-track-premium card">
      <div className="race-track-header">
        <div>
          <h3>מסלול המרוץ</h3>
          <p className="muted">התקדמות בזמן אמת לקו הסיום</p>
        </div>
        <div className="race-track-finish">🏁 1000</div>
      </div>

      <div className="race-track-grid">
        {sorted.map((p, index) => {
          const pct = Math.max(0, Math.min(100, (p.progressPoints / 1000) * 100));
          return (
            <div key={p.participantId} className="race-lane" style={{ animationDelay: `${index * 60}ms` }}>
              <div className="race-lane-meta">
                <span className="race-lane-rank">#{index + 1}</span>
                <span className="race-lane-icon">{CAR_ICONS[index % CAR_ICONS.length]}</span>
                <strong className="race-lane-name">{p.displayName}</strong>
                <span className="race-lane-score">{p.progressPoints}</span>
              </div>
              <div className="race-lane-track">
                <div className="race-lane-gridlines" aria-hidden="true" />
                <div
                  className="race-lane-car"
                  style={{
                    insetInlineStart: `${pct}%`,
                    background: p.carColor,
                    boxShadow: `0 0 18px ${p.carColor}88`
                  }}
                >
                  <span className="race-lane-car-icon">{CAR_ICONS[index % CAR_ICONS.length]}</span>
                </div>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 ? <p className="muted race-track-empty">אין מתחרים פעילים על המסלול</p> : null}
      </div>
    </section>
  );
}
