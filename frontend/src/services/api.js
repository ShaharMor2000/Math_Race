import { session } from "./session";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080/api/v1";
const MOCK_TEACHERS_KEY = "mathrace_mock_teachers";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function loadMockTeachers() {
  try {
    const raw = localStorage.getItem(MOCK_TEACHERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMockTeachers(users) {
  localStorage.setItem(MOCK_TEACHERS_KEY, JSON.stringify(users));
}

function createMockToken(email) {
  return `mock-teacher-${btoa(unescape(encodeURIComponent(email)))}-${Date.now()}`;
}

function validateTeacherRegistration(fullName, email, password) {
  const normalizedEmail = normalizeEmail(email);
  if (!String(fullName || "").trim()) {
    throw new Error("שם מלא הוא שדה חובה");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("אימייל לא תקין");
  }
  if (String(password || "").length < 8) {
    throw new Error("הסיסמה חייבת להכיל לפחות 8 תווים");
  }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/.test(password)) {
    throw new Error("הסיסמה חייבת להכיל אות גדולה, אות קטנה, מספר ותו מיוחד");
  }
}

function registerMockTeacher(fullName, email, password) {
  validateTeacherRegistration(fullName, email, password);
  const normalizedEmail = normalizeEmail(email);
  const users = loadMockTeachers();
  if (users.some((user) => user.email === normalizedEmail)) {
    const error = new Error("המייל כבר קיים במערכת, נסי להתחבר.");
    error.code = "EMAIL_EXISTS";
    throw error;
  }

  const teacher = {
    id: Date.now(),
    fullName: String(fullName || "").trim(),
    email: normalizedEmail,
    password
  };
  saveMockTeachers([...users, teacher]);
  return { teacherId: teacher.id, email: teacher.email, message: "החשבון נוצר בהצלחה" };
}

function loginMockTeacher(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const teacher = loadMockTeachers().find((user) => user.email === normalizedEmail);
  if (!teacher) {
    throw new Error("המשתמש לא נמצא");
  }
  if (teacher.password !== password) {
    throw new Error("הסיסמה שגויה");
  }
  return {
    accessToken: createMockToken(teacher.email),
    teacher: {
      id: teacher.id,
      fullName: teacher.fullName,
      email: teacher.email
    }
  };
}

function getValidationMessage(details, fallback) {
  if (details && typeof details === "object") {
    if (details.fullName) return details.fullName;
    if (details.email) return details.email;
    if (details.password) return details.password;
  }
  if (typeof fallback === "string" && fallback !== "Validation failed") {
    return fallback;
  }
  return "פרטי ההרשמה אינם תקינים";
}

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

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });
  } catch {
    const error = new Error("Backend server is not running. Start the server on port 8080 and try again.");
    error.code = "BACKEND_UNAVAILABLE";
    throw error;
  }

  if (!response.ok) {
    const errBody = await response.text();
    let errorMessage = errBody || "API error";
    let parsedError = null;
    try {
      const parsed = JSON.parse(errBody);
      parsedError = parsed;
      errorMessage =
        parsed.code === "VALIDATION_ERROR"
          ? getValidationMessage(parsed.details, parsed.message)
          : parsed.message || errorMessage;
    } catch {
      // Keep the raw response text when the server did not return JSON.
    }
    console.error("API error response", {
      "status code": response.status,
      path,
      "response body": parsedError || errBody,
      "error message": errorMessage
    });
    const error = new Error(errorMessage);
    error.status = response.status;
    error.responseBody = parsedError || errBody;
    if (parsedError?.code) error.code = parsedError.code;
    if (parsedError?.details) error.details = parsedError.details;
    throw error;
  }

  return response.json();
}

export const api = {
  teacherRegister: async (fullName, email, password) => {
    try {
      return await request("/auth/teacher/register", {
        method: "POST",
        body: JSON.stringify({ fullName, email, password }),
        useTeacherAuth: false
      });
    } catch (error) {
      if (error.code === "BACKEND_UNAVAILABLE") {
        return registerMockTeacher(fullName, email, password);
      }
      throw error;
    }
  },

  teacherLogin: async (email, password) => {
    try {
      return await request("/auth/teacher/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        useTeacherAuth: false
      });
    } catch (error) {
      if (error.code === "BACKEND_UNAVAILABLE") {
        return loginMockTeacher(email, password);
      }
      throw error;
    }
  },

  teacherGoogleLogin: (idToken) =>
    request("/auth/teacher/google", {
      method: "POST",
      body: JSON.stringify({ idToken }),
      useTeacherAuth: false
    }),

  teacherForgotPassword: (email) =>
    request("/auth/teacher/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
      useTeacherAuth: false
    }),

  teacherValidateResetToken: (token) =>
    request(`/auth/teacher/reset-password/validate?token=${encodeURIComponent(token)}`, {
      useTeacherAuth: false
    }),

  teacherResetPassword: (token, password) =>
    request("/auth/teacher/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
      useTeacherAuth: false
    }),

  teacherResetPasswordDirect: (email, password) =>
    request("/auth/teacher/reset-password/direct", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      useTeacherAuth: false
    }),

  createRace: (payload) =>
    request("/teacher/races", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  updateRace: (roomCode, payload) =>
    request(`/teacher/races/${roomCode}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),

  listTeacherRaces: () => request("/teacher/races"),

  listOpenRaces: () => request("/student/races/open"),

  listStudentRaces: (email) => request(`/student/races/mine?email=${encodeURIComponent(email)}`),

  roomDetails: (roomCode) => request(`/teacher/races/${roomCode}`),

  addStudent: (roomCode, email) =>
    request(`/teacher/races/${roomCode}/students`, {
      method: "POST",
      body: JSON.stringify({ email })
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

  removeParticipant: (roomCode, participantId) =>
    request(`/teacher/races/${roomCode}/participants/${participantId}`, {
      method: "DELETE"
    }),

  joinRace: (roomCode, displayName) =>
    request("/student/join", {
      method: "POST",
      body: JSON.stringify({
        roomCode,
        displayName,
        email: session.getGuestEmail()
      }),
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
