import { session } from "./session";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080/api/v1";

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (!headers.Authorization) {
    const teacherToken = session.getTeacherToken();
    const studentToken = session.getStudentToken();
    if (teacherToken && options.useTeacherAuth !== false) {
      headers.Authorization = `Bearer ${teacherToken}`;
    } else if (studentToken && options.useStudentAuth) {
      headers.Authorization = `Bearer ${studentToken}`;
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(errBody || "API error");
  }

  return response.json();
}

export const api = {
  teacherRegister: (fullName, email, password) =>
    request("/auth/teacher/register", {
      method: "POST",
      body: JSON.stringify({ fullName, email, password })
    }),

  teacherLogin: (email, password) =>
    request("/auth/teacher/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      useTeacherAuth: false
    }),

  teacherGoogleLogin: (idToken) =>
    request("/auth/teacher/google", {
      method: "POST",
      body: JSON.stringify({ idToken }),
      useTeacherAuth: false
    }),

  createRace: (payload) =>
    request("/teacher/races", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  listTeacherRaces: () => request("/teacher/races"),

  listOpenRaces: () => request("/student/races/open"),

  roomDetails: (roomCode) => request(`/teacher/races/${roomCode}`),

  addStudent: (roomCode, displayName) =>
    request(`/teacher/races/${roomCode}/students`, {
      method: "POST",
      body: JSON.stringify({ displayName })
    }),

  startRace: (roomCode) =>
    request(`/teacher/races/${roomCode}/start`, {
      method: "POST"
    }),

  pauseRace: (roomCode) =>
    request(`/teacher/races/${roomCode}/pause`, {
      method: "POST"
    }),

  resumeRace: (roomCode) =>
    request(`/teacher/races/${roomCode}/resume`, {
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
      body: JSON.stringify({ roomCode, displayName }),
      useTeacherAuth: false
    }),

  nextQuestion: (roomCode) =>
    request(`/student/races/${roomCode}/question`, {
      useStudentAuth: true,
      useTeacherAuth: false
    }),

  submitAnswer: (roomCode, payload) =>
    request(`/student/races/${roomCode}/answer`, {
      method: "POST",
      useStudentAuth: true,
      useTeacherAuth: false,
      body: JSON.stringify(payload)
    }),

  swapQuestion: (roomCode, questionId) =>
    request(`/student/races/${roomCode}/swap?questionId=${questionId}`, {
      method: "POST",
      useStudentAuth: true,
      useTeacherAuth: false
    }),

  choosePath: (roomCode, choice) =>
    request(`/student/races/${roomCode}/path`, {
      method: "POST",
      useStudentAuth: true,
      useTeacherAuth: false,
      body: JSON.stringify({ choice })
    }),

  leaderboard: (roomCode) => request(`/teacher/races/${roomCode}/leaderboard`),

  finalResults: (roomCode) => request(`/races/${roomCode}/results`)
};
