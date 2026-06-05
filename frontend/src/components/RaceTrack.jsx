export function RaceTrack({ participants }) {
  return (
    <div className="track">
      {participants.map((p) => (
        <div key={p.participantId} className="lane">
          <span className="lane-name">{p.displayName}</span>
          <div className="lane-progress">
            <div
              className="car"
              style={{ insetInlineStart: `${(p.progressPoints / 1000) * 100}%`, background: p.carColor }}
            />
          </div>
          <span>{p.progressPoints}/1000</span>
        </div>
      ))}
    </div>
  );
}
