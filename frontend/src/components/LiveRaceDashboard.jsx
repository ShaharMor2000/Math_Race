import { useEffect, useState } from "react";
import { EventFeed } from "./EventFeed";
import { GameEventToast } from "./GameEventToast";
import { Leaderboard } from "./Leaderboard";
import { RaceTrack } from "./RaceTrack";

function formatRemaining(startAt, durationMinutes) {
  if (!startAt || !durationMinutes) return null;
  const start = new Date(startAt).getTime();
  const end = start + durationMinutes * 60 * 1000;
  const remaining = Math.max(0, end - Date.now());
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function LiveRaceDashboard({
  roomCode,
  roomStatus,
  startAt,
  raceDurationMinutes,
  participants,
  leaderboard,
  eventMessage,
  eventFeed,
  onEndRace,
  onPauseRace,
  onResumeRace
}) {
  const [remaining, setRemaining] = useState(formatRemaining(startAt, raceDurationMinutes));
  const joinLink = `${window.location.origin}/join/${roomCode}`;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemaining(formatRemaining(startAt, raceDurationMinutes));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [startAt, raceDurationMinutes]);

  return (
    <section className="stack live-dashboard projector-mode">
      <div className="card row between projector-header">
        <div>
          <h2>מרוץ חי</h2>
          <p className="room-code-large">קוד חדר: {roomCode}</p>
          <p className="join-link">לינק להצטרפות: {joinLink}</p>
          <p className="race-status">סטטוס: {roomStatus || "RUNNING"}</p>
          {remaining ? <p className="global-timer">זמן נותר: {remaining}</p> : null}
        </div>
        <div className="row">
          {roomStatus === "RUNNING" ? (
            <button className="ghost" onClick={onPauseRace}>השהה</button>
          ) : null}
          {roomStatus === "PAUSED" ? (
            <button onClick={onResumeRace}>המשך</button>
          ) : null}
          <button onClick={onEndRace}>סיום מרוץ</button>
        </div>
      </div>
      <RaceTrack participants={participants} />
      <div className="dashboard-panels">
        <Leaderboard rows={leaderboard} />
        <div className="card">
          <h3>התראות חיות</h3>
          <EventFeed events={eventFeed} />
        </div>
      </div>
      <GameEventToast message={eventMessage} />
    </section>
  );
}
