export function FloatingNumbersBackground() {
  const items = [
    ["7", 72, 120, "slow"],
    ["12", 250, 86, "medium"],
    ["3x", 430, 160, "fast"],
    ["42", 640, 98, "slow"],
    ["9", 860, 176, "medium"],
    ["15", 1060, 120, "fast"],
    ["8", 1220, 230, "slow"],
    ["24", 140, 330, "fast"],
    ["5", 360, 420, "slow"],
    ["x2", 560, 360, "medium"],
    ["18", 780, 450, "fast"],
    ["6", 980, 340, "slow"],
    ["30", 1160, 430, "medium"],
    ["11", 220, 620, "medium"],
    ["4", 500, 650, "fast"],
    ["21", 740, 590, "slow"],
    ["10", 980, 650, "fast"]
  ];

  return (
    <svg className="auth-number-field" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g className="number-layer number-layer-a">
        {items.slice(0, 6).map(([text, x, y, speed]) => (
          <text key={`${text}-${x}-${y}`} className={`floating-number ${speed}`} x={x} y={y}>
            {text}
          </text>
        ))}
      </g>
      <g className="number-layer number-layer-b">
        {items.slice(6, 12).map(([text, x, y, speed]) => (
          <text key={`${text}-${x}-${y}`} className={`floating-number ${speed}`} x={x} y={y}>
            {text}
          </text>
        ))}
      </g>
      <g className="number-layer number-layer-c">
        {items.slice(12).map(([text, x, y, speed]) => (
          <text key={`${text}-${x}-${y}`} className={`floating-number ${speed}`} x={x} y={y}>
            {text}
          </text>
        ))}
      </g>
    </svg>
  );
}
