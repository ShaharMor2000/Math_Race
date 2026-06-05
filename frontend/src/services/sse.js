const API_BASE = "http://localhost:8080/api/v1";

export function createRoomStream(roomCode, onEvent) {
  const es = new EventSource(`${API_BASE}/stream/rooms/${roomCode}`);
  const eventNames = [
    "heartbeat",
    "race_started",
    "position_update",
    "leaderboard_update",
    "game_event",
    "overtake",
    "bonus",
    "question_ready",
    "registration_requested",
    "registration_approved",
    "registration_rejected",
    "race_finished"
  ];

  eventNames.forEach((name) => {
    es.addEventListener(name, (event) => {
      const payload = JSON.parse(event.data);
      onEvent(payload);
    });
  });
  return es;
}
