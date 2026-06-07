const CAR_ICONS = ["🚗", "🏎️", "🚙", "🛻", "🚕", "🚓", "🏁", "🚘"];

export function RaceTrack({ participants }) {
  return (
    <div className="track">
      {participants.map((p, index) => (
        <div key={p.participantId} className="lane">
          <span className="lane-name">
            {CAR_ICONS[index % CAR_ICONS.length]} {p.displayName}
          </span>
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
