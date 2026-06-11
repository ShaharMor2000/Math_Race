const TEACHER_TOKEN_KEY = "mathrace_teacher_token";
const TEACHER_ID_KEY = "mathrace_teacher_id";
const STUDENT_TOKEN_KEY = "mathrace_student_token";
const STUDENT_PARTICIPANT_KEY = "mathrace_student_participant_id";
const STUDENT_ROOM_KEY = "mathrace_student_room_code";
const STUDENT_STATUS_KEY = "mathrace_student_status";
const STUDENT_EMAIL_KEY = "mathrace_student_email";

export const session = {
  saveTeacher(token, teacherId) {
    localStorage.setItem(TEACHER_TOKEN_KEY, token);
    localStorage.setItem(TEACHER_ID_KEY, String(teacherId));
  },
  getTeacherToken() {
    return localStorage.getItem(TEACHER_TOKEN_KEY);
  },
  getTeacherId() {
    const value = localStorage.getItem(TEACHER_ID_KEY);
    return value ? Number(value) : null;
  },
  clearTeacher() {
    localStorage.removeItem(TEACHER_TOKEN_KEY);
    localStorage.removeItem(TEACHER_ID_KEY);
  },
  saveStudent(token, participantId, roomCode, status, email) {
    localStorage.setItem(STUDENT_TOKEN_KEY, token);
    localStorage.setItem(STUDENT_PARTICIPANT_KEY, String(participantId));
    localStorage.setItem(STUDENT_ROOM_KEY, roomCode);
    localStorage.setItem(STUDENT_STATUS_KEY, status);
    if (email) {
      localStorage.setItem(STUDENT_EMAIL_KEY, email);
    }
  },
  getStudentToken() {
    return localStorage.getItem(STUDENT_TOKEN_KEY);
  },
  getStudentParticipantId() {
    const value = localStorage.getItem(STUDENT_PARTICIPANT_KEY);
    return value ? Number(value) : null;
  },
  getStudentRoomCode() {
    return localStorage.getItem(STUDENT_ROOM_KEY);
  },
  getStudentStatus() {
    return localStorage.getItem(STUDENT_STATUS_KEY);
  },
  getStudentEmail() {
    return localStorage.getItem(STUDENT_EMAIL_KEY);
  },
  saveStudentEmail(email) {
    localStorage.setItem(STUDENT_EMAIL_KEY, email);
  },
  clearStudent() {
    localStorage.removeItem(STUDENT_TOKEN_KEY);
    localStorage.removeItem(STUDENT_PARTICIPANT_KEY);
    localStorage.removeItem(STUDENT_ROOM_KEY);
    localStorage.removeItem(STUDENT_STATUS_KEY);
    localStorage.removeItem(STUDENT_EMAIL_KEY);
  }
};
