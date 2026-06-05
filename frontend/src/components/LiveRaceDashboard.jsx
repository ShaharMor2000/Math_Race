import { DocNote } from "./DocNote";
import { GameEventToast } from "./GameEventToast";
import { Leaderboard } from "./Leaderboard";
import { RaceTrack } from "./RaceTrack";

export function LiveRaceDashboard({ roomCode, participants, leaderboard, eventMessage, onEndRace }) {
  return (
    <section className="stack">
      <div className="card row between">
        <h2>מרוץ חי - {roomCode}</h2>
        <button onClick={onEndRace}>סיום מרוץ</button>
      </div>
      <DocNote
        title="Live Race Dashboard"
        text="This projected classroom view receives real-time SSE updates for car positions, overtakes, game events, and leaderboard changes."
      />
      <RaceTrack participants={participants} />
      <Leaderboard rows={leaderboard} />
      <GameEventToast message={eventMessage} />
    </section>
  );
}
