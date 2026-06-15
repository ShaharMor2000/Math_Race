const TEACHER_TOKEN_KEY = "mathrace_teacher_token";
const TEACHER_ID_KEY = "mathrace_teacher_id";
const STUDENT_TOKEN_KEY = "mathrace_student_token";
const STUDENT_PARTICIPANT_KEY = "mathrace_student_participant_id";
const STUDENT_ROOM_KEY = "mathrace_student_room_code";
const STUDENT_STATUS_KEY = "mathrace_student_status";
const STUDENT_DISPLAY_NAME_KEY = "mathrace_student_display_name";
const GUEST_ID_KEY = "mathrace_guest_id";

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
  getOrCreateGuestId() {
    let guestId = localStorage.getItem(GUEST_ID_KEY);
    if (!guestId) {
      guestId = crypto.randomUUID();
      localStorage.setItem(GUEST_ID_KEY, guestId);
    }
    return guestId;
  },
  getGuestEmail() {
    return `guest.${this.getOrCreateGuestId()}@mathrace.local`;
  },
  saveStudent(token, participantId, roomCode, status, displayName) {
    localStorage.setItem(STUDENT_TOKEN_KEY, token);
    localStorage.setItem(STUDENT_PARTICIPANT_KEY, String(participantId));
    localStorage.setItem(STUDENT_ROOM_KEY, roomCode);
    localStorage.setItem(STUDENT_STATUS_KEY, status);
    if (displayName) {
      localStorage.setItem(STUDENT_DISPLAY_NAME_KEY, displayName);
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
  getStudentDisplayName() {
    return localStorage.getItem(STUDENT_DISPLAY_NAME_KEY) || "";
  },
  clearStudent() {
    localStorage.removeItem(STUDENT_TOKEN_KEY);
    localStorage.removeItem(STUDENT_PARTICIPANT_KEY);
    localStorage.removeItem(STUDENT_ROOM_KEY);
    localStorage.removeItem(STUDENT_STATUS_KEY);
    localStorage.removeItem(STUDENT_DISPLAY_NAME_KEY);
  }
};
