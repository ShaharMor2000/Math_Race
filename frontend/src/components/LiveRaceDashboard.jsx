import { useEffect, useState } from "react";
import { Badge, Button, Card } from "./ui/Primitives";
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

const STATUS_LABELS = {
  RUNNING: "רץ",
  PAUSED: "מושהה",
  FINISHED: "הסתיים",
  LOBBY: "לובי",
  LOCKED: "נעול"
};

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
  onResumeRace,
  onBack
}) {
  const [remaining, setRemaining] = useState(formatRemaining(startAt, raceDurationMinutes));
  const [copied, setCopied] = useState(false);
  const joinLink = `${window.location.origin}/join/${roomCode}`;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemaining(formatRemaining(startAt, raceDurationMinutes));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [startAt, raceDurationMinutes]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="stack live-dashboard projector-mode">
      <Card className="projector-header premium-header">
        <div className="projector-header-main">
          <Badge variant="live">שידור חי</Badge>
          <h2>מרוץ חי</h2>
          <p className="room-code-display">{roomCode}</p>
          <div className="join-link-row">
            <span className="join-link">{joinLink}</span>
            <Button variant="ghost" size="sm" className="copy-link-btn" onClick={() => void copyLink()}>
              {copied ? "הועתק!" : "העתק לינק"}
            </Button>
          </div>
          <div className="projector-stats">
            <Badge variant={roomStatus === "PAUSED" ? "warning" : "success"}>{STATUS_LABELS[roomStatus] || roomStatus}</Badge>
            {remaining ? <span className="global-timer">⏱ {remaining}</span> : null}
            <span className="muted">{participants.length} רכבים על המסלול</span>
          </div>
        </div>
        <div className="projector-actions page-header-actions">
          {onBack ? <Button variant="ghost" size="sm" onClick={onBack}>חזרה</Button> : null}
          {roomStatus === "RUNNING" ? <Button variant="ghost" size="sm" onClick={onPauseRace}>השהה</Button> : null}
          {roomStatus === "PAUSED" ? <Button size="sm" onClick={onResumeRace}>המשך</Button> : null}
          <Button variant="danger" size="sm" onClick={onEndRace}>סיום מרוץ</Button>
        </div>
      </Card>

      {roomStatus === "PAUSED" ? (
        <div className="banner banner-warning">המרוץ מושהה — התלמידים ממתינים להמשך</div>
      ) : null}

      <RaceTrack participants={participants} />
      <div className="dashboard-panels">
        <Leaderboard rows={leaderboard} />
        <Card className="event-feed-card">
          <h3>התראות חיות</h3>
          <EventFeed events={eventFeed} />
        </Card>
      </div>
      <GameEventToast message={eventMessage} />
    </section>
  );
}
