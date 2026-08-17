import { session } from "./session";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080/api/v1";

export function createRoomStream(roomCode, onEvent, options = {}) {
  const params = new URLSearchParams();
  if (options.role) params.set("role", options.role);
  if (options.participantId) params.set("participantId", String(options.participantId));

  const token = options.role === "STUDENT" ? session.getStudentToken() : session.getTeacherToken();
  if (token) params.set("token", token);

  const query = params.toString();
  const url = `${API_BASE}/stream/rooms/${roomCode}${query ? `?${query}` : ""}`;
  const es = new EventSource(url);

  const eventNames = [
    "heartbeat",
    "race_started",
    "race_paused",
    "race_resumed",
    "room_locked",
    "room_unlocked",
    "position_update",
    "leaderboard_update",
    "game_event",
    "overtake",
    "bonus",
    "question_ready",
    "registration_requested",
    "registration_approved",
    "registration_rejected",
    "registration_cancelled",
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
