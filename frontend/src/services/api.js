const API_BASE = "http://localhost:8080/api/v1";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(errBody || "API error");
  }

  return response.json();
}

export const api = {
  teacherLogin: (email, password) =>
    request("/auth/teacher/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }),

  teacherGoogleLogin: (idToken) =>
    request("/auth/teacher/google", {
      method: "POST",
      body: JSON.stringify({ idToken })
    }),

  createRace: (teacherId, payload) =>
    request("/teacher/races", {
      method: "POST",
      headers: { "X-Teacher-Id": String(teacherId) },
      body: JSON.stringify(payload)
    }),

  listTeacherRaces: (teacherId) =>
    request("/teacher/races", {
      headers: { "X-Teacher-Id": String(teacherId) }
    }),

  listOpenRaces: () => request("/student/races/open"),

  roomDetails: (roomCode) => request(`/teacher/races/${roomCode}`),

  startRace: (roomCode) =>
    request(`/teacher/races/${roomCode}/start`, {
      method: "POST"
    }),

  endRace: (roomCode) =>
    request(`/teacher/races/${roomCode}/end`, {
      method: "POST"
    }),

  approveParticipant: (roomCode, participantId) =>
    request(`/teacher/races/${roomCode}/participants/${participantId}/approve`, {
      method: "POST"
    }),

  rejectParticipant: (roomCode, participantId) =>
    request(`/teacher/races/${roomCode}/participants/${participantId}/reject`, {
      method: "POST"
    }),

  joinRace: (roomCode, displayName) =>
    request("/student/join", {
      method: "POST",
      body: JSON.stringify({ roomCode, displayName })
    }),

  nextQuestion: (roomCode, participantId) =>
    request(`/student/races/${roomCode}/question`, {
      headers: { "X-Participant-Id": String(participantId) }
    }),

  submitAnswer: (roomCode, participantId, payload) =>
    request(`/student/races/${roomCode}/answer`, {
      method: "POST",
      headers: { "X-Participant-Id": String(participantId) },
      body: JSON.stringify(payload)
    }),

  choosePath: (roomCode, participantId, choice) =>
    request(`/student/races/${roomCode}/path`, {
      method: "POST",
      headers: { "X-Participant-Id": String(participantId) },
      body: JSON.stringify({ choice })
    }),

  leaderboard: (roomCode) => request(`/teacher/races/${roomCode}/leaderboard`),

  finalResults: (roomCode) => request(`/races/${roomCode}/results`)
};
