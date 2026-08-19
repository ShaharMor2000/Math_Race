import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { CreateRace } from "./components/CreateRace";
import { FinalResults } from "./components/FinalResults";
import { LiveRaceDashboard } from "./components/LiveRaceDashboard";
import { FloatingNumbersBackground } from "./components/FloatingNumbersBackground";
import { RaceLobby } from "./components/RaceLobby";
import { StudentDashboard } from "./components/StudentDashboard";
import { StudentJoin } from "./components/StudentJoin";
import { StudentRaceScreen } from "./components/StudentRaceScreen";
import { TeacherAuthModal } from "./components/TeacherAuthModal";
import { TeacherDashboard } from "./components/TeacherDashboard";
import { Toast } from "./components/Toast";
import { AppChrome, Button, ConfirmDialog } from "./components/ui/Primitives";
import { useRaceStream } from "./hooks/useRaceStream";
import { api } from "./services/api";
import { session } from "./services/session";

function App() {
  const { roomCode: joinRoomCode } = useParams();
  const [theme, setTheme] = useState(() => localStorage.getItem("mathRaceTheme") || "dark");
  const [role, setRole] = useState(() => (session.hasValidTeacherSession() ? "teacher" : "student"));
  const [teacherId, setTeacherId] = useState(() => (session.hasValidTeacherSession() ? session.getTeacherId() : null));
  const [rooms, setRooms] = useState([]);
  const [isCreatingRace, setIsCreatingRace] = useState(false);
  const [isEditingRace, setIsEditingRace] = useState(false);
  const [activeRoomCode, setActiveRoomCode] = useState(null);
  const [roomMeta, setRoomMeta] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [lastCreatedRoomCode, setLastCreatedRoomCode] = useState(null);
  const [teacherEventMessage, setTeacherEventMessage] = useState(null);
  const [teacherEventFeed, setTeacherEventFeed] = useState([]);
  const [teacherFinalRows, setTeacherFinalRows] = useState(null);
  const [teacherWinnerName, setTeacherWinnerName] = useState(null);
  const [teacherError, setTeacherError] = useState("");
  const [openingRoomCode, setOpeningRoomCode] = useState(null);

  const [studentRoomCode, setStudentRoomCode] = useState(session.getStudentRoomCode());
  const [studentDisplayName, setStudentDisplayName] = useState(session.getStudentDisplayName());
  const [studentParticipantId, setStudentParticipantId] = useState(session.getStudentParticipantId());
  const [studentParticipantStatus, setStudentParticipantStatus] = useState(session.getStudentStatus());
  const [studentRoomStatus, setStudentRoomStatus] = useState(null);
  const [studentProgress, setStudentProgress] = useState(0);
  const [studentScore, setStudentScore] = useState(0);
  const [studentQuestion, setStudentQuestion] = useState(null);
  const [studentEventMessage, setStudentEventMessage] = useState(null);
  const [pendingPathDecision, setPendingPathDecision] = useState(false);
  const [studentFinalRows, setStudentFinalRows] = useState(null);
  const [studentWinnerName, setStudentWinnerName] = useState(null);
  const [openRaces, setOpenRaces] = useState([]);
  const [openRacesLoading, setOpenRacesLoading] = useState(false);
  const [openRacesError, setOpenRacesError] = useState("");
  const [studentView, setStudentView] = useState("dashboard");
  const [joinMode, setJoinMode] = useState("general");
  const [joinPreset, setJoinPreset] = useState(null);
  const [answerFeedback, setAnswerFeedback] = useState(null);
  const [studentRacePaused, setStudentRacePaused] = useState(false);
  const [toast, setToast] = useState(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [pendingLogout, setPendingLogout] = useState(null);
  const [raceRemovalCandidate, setRaceRemovalCandidate] = useState(null);
  const [removingRoomCode, setRemovingRoomCode] = useState(null);
  const [teacherAuthOpen, setTeacherAuthOpen] = useState(false);
  const [studentAlert, setStudentAlert] = useState(null);
  const fetchNextQuestionInFlightRef = useRef(null);
  const pendingPathDecisionRef = useRef(false);
  const questionBusyRef = useRef(false);
  const questionRequestIdRef = useRef(0);
  const currentQuestionIdRef = useRef(null);
  const handledQuestionIdsRef = useRef(new Set());

  const showToast = useCallback((message, type = "error") => {
    if (!message) return;
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4500);
  }, []);

  const runAction = useCallback(async (action, successMessage) => {
    try {
      const result = await action();
      if (successMessage) showToast(successMessage, "success");
      return result;
    } catch (error) {
      showToast(error.message || "אירעה שגיאה");
      throw error;
    }
  }, [showToast]);

  const clearInvalidTeacherSession = useCallback(() => {
    session.clearTeacher();
    setTeacherId(null);
    setRole("student");
    setTeacherAuthOpen(true);
    setRooms([]);
    setTeacherError("");
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("mathRaceTheme", theme);
  }, [theme]);

  useEffect(() => {
    const handleInvalidTeacherAuth = () => {
      setTeacherId(null);
      setRole("student");
      setTeacherAuthOpen(true);
      setRooms([]);
      setTeacherError("");
      resetTeacherFlow();
    };
    window.addEventListener("mathrace:teacher-auth-invalid", handleInvalidTeacherAuth);
    return () => window.removeEventListener("mathrace:teacher-auth-invalid", handleInvalidTeacherAuth);
  }, []);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const activeRoomForStream = role === "teacher" ? activeRoomCode : studentRoomCode;
  useRaceStream(
    activeRoomForStream,
    (event) => {
      handleStreamEvent(event);
    },
    {
      role: role === "teacher" ? "TEACHER" : "STUDENT",
      participantId: role === "student" ? studentParticipantId : null
    }
  );

  useEffect(() => {
    if (!teacherId || role !== "teacher") return;
    void refreshTeacherRooms();
    const timer = window.setInterval(() => {
      if (!activeRoomCode) {
        void refreshTeacherRooms().catch(() => {});
      }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [teacherId, role, activeRoomCode]);

  useEffect(() => {
    if (!session.getStudentRoomCode()) return;
    setRole("student");
    setStudentView("race");
  }, []);

  useEffect(() => {
    void refreshOpenRaces().catch((error) => showToast(error.message));
    if (joinRoomCode) {
      setJoinMode("specific");
      setJoinPreset({ roomCode: joinRoomCode.toUpperCase(), title: "מרוץ" });
      setStudentView("join");
    }
  }, [joinRoomCode, showToast]);

  useEffect(() => {
    if (role !== "student" || studentRoomCode) return;
    void refreshOpenRaces().catch((error) => showToast(error.message));
    const timer = window.setInterval(() => {
      void refreshOpenRaces().catch(() => {});
    }, 4000);
    return () => window.clearInterval(timer);
  }, [role, studentRoomCode, showToast]);

  const pushTeacherEvent = useCallback((type, message) => {
    if (!message) return;
    setTeacherEventFeed((prev) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        type,
        message,
        time: new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      },
      ...prev
    ].slice(0, 25));
    setTeacherEventMessage(message);
  }, []);

  const fetchNextQuestion = useCallback(async (roomCode, options = {}) => {
    const advance = Boolean(options.advance);
    const attempt = Number(options.attempt || 0);
    if (!roomCode || pendingPathDecisionRef.current) return;
    if (!advance && questionBusyRef.current) return;
    if (!advance && fetchNextQuestionInFlightRef.current && attempt === 0) {
      return fetchNextQuestionInFlightRef.current;
    }

    const requestId = ++questionRequestIdRef.current;
    const request = (async () => {
      try {
        const q = await api.nextQuestion(roomCode, advance);
        if (requestId !== questionRequestIdRef.current || pendingPathDecisionRef.current) {
          return;
        }
        if (handledQuestionIdsRef.current.has(q.questionId)) {
          if (attempt < 4) {
            await fetchNextQuestion(roomCode, { advance: true, attempt: attempt + 1 });
          }
          return;
        }
        setStudentQuestion((prev) => {
          if (prev?.questionId === q.questionId) {
            return prev;
          }
          currentQuestionIdRef.current = q.questionId;
          return q;
        });
      } catch (error) {
        const message = String(error?.message || "");
        const code = String(error?.code || "");
        if ((code === "ROOM_NOT_RUNNING" || message.includes("ROOM_NOT_RUNNING")) && attempt < 5) {
          window.setTimeout(() => void fetchNextQuestion(roomCode, { advance, attempt: attempt + 1 }), 300 * (attempt + 1));
          return;
        }
        const isVehicleFrozen =
          code === "VEHICLE_FROZEN" ||
          message.includes("VEHICLE_FROZEN") ||
          message.includes("הרכב נעצר");
        if (isVehicleFrozen && attempt < 4) {
          setStudentQuestion(null);
          setStudentEventMessage("הרכב נעצר לרגע אחרי כישלון באוטוסטרדה...");
          window.setTimeout(() => void fetchNextQuestion(roomCode, { advance, attempt: attempt + 1 }), 1500);
        }
      } finally {
        if (!advance && attempt === 0 && fetchNextQuestionInFlightRef.current) {
          fetchNextQuestionInFlightRef.current = null;
        }
      }
    })();

    if (!advance && attempt === 0) {
      fetchNextQuestionInFlightRef.current = request;
    }
    return request;
  }, []);

  const applyStudentRoomState = useCallback((state) => {
    const status = state?.status || state?.raceStatus;
    const participantStatus = state?.participantStatus;
    if (status) {
      setStudentRoomStatus(status);
      setStudentRacePaused(status === "PAUSED");
    }
    if (participantStatus) {
      setStudentParticipantStatus(participantStatus);
      session.saveStudent(
        session.getStudentToken(),
        studentParticipantId,
        studentRoomCode,
        participantStatus,
        studentDisplayName
      );
    }
    if (Number.isFinite(Number(state?.progress))) {
      setStudentProgress(Number(state.progress));
    }
    if (Number.isFinite(Number(state?.score))) {
      setStudentScore(Number(state.score));
    }

    const effectiveParticipantStatus = participantStatus || studentParticipantStatus;
    if (studentRoomCode && effectiveParticipantStatus === "ACTIVE") {
      if (status === "RUNNING") {
        setStudentRacePaused(false);
        setStudentView("race");
        if (!studentQuestion && !pendingPathDecisionRef.current && !questionBusyRef.current) {
          void fetchNextQuestion(studentRoomCode);
        }
      } else if (status === "PAUSED") {
        setStudentView("race");
      }
    }
  }, [fetchNextQuestion, studentDisplayName, studentParticipantId, studentParticipantStatus, studentQuestion, studentRoomCode]);

  const syncStudentRoomSummary = useCallback(async () => {
    if (!studentRoomCode) return;
    const races = await api.listStudentRaces(session.getGuestEmail());
    const current = races.find((race) => race.roomCode === studentRoomCode);
    if (!current) return;
    applyStudentRoomState({
      status: current.raceStatus,
      participantStatus: current.participantStatus,
      progress: current.progressPoints,
      score: current.scoreTotal
    });
  }, [applyStudentRoomState, studentRoomCode]);

  useEffect(() => {
    if (role !== "student" || !studentRoomCode || studentParticipantStatus !== "ACTIVE") return;
    if (studentRoomStatus === "RUNNING" || studentRoomStatus === "PAUSED") {
      setStudentView("race");
      setStudentRacePaused(studentRoomStatus === "PAUSED");
      if (studentRoomStatus === "RUNNING" && !studentQuestion && !pendingPathDecisionRef.current && !questionBusyRef.current) {
        void fetchNextQuestion(studentRoomCode);
      }
    }
  }, [role, studentRoomCode, studentParticipantStatus, studentRoomStatus, studentQuestion, fetchNextQuestion]);

  useEffect(() => {
    if (!studentRoomCode || !studentParticipantId || studentParticipantStatus !== "ACTIVE") return;
    if (studentRoomStatus !== "RUNNING") return;
    if (studentQuestion || studentFinalRows || pendingPathDecisionRef.current || questionBusyRef.current) return;
    void fetchNextQuestion(studentRoomCode);
  }, [studentRoomCode, studentParticipantId, studentParticipantStatus, studentRoomStatus, studentQuestion, studentFinalRows, fetchNextQuestion]);

  useEffect(() => {
    if (role !== "student" || !studentRoomCode || !studentParticipantId || studentFinalRows) return;
    void syncStudentRoomSummary().catch(() => {});
    const timer = window.setInterval(() => {
      void syncStudentRoomSummary().catch(() => {});
    }, 4000);
    return () => window.clearInterval(timer);
  }, [role, studentRoomCode, studentParticipantId, studentFinalRows, syncStudentRoomSummary]);

  const refreshTeacherRooms = async () => {
    if (!session.hasValidTeacherSession()) {
      clearInvalidTeacherSession();
      return;
    }
    try {
      const list = await api.listTeacherRaces();
      setRooms(list);
      setTeacherError("");
    } catch (error) {
      setTeacherError(error.message || "לא ניתן לטעון את רשימת המרוצים.");
    }
  };

  const handleTeacherLogin = async (email, password) => {
    const response = await api.teacherLogin(email, password);
    session.saveTeacher(response.accessToken, response.teacher.id);
    setTeacherId(response.teacher.id);
    setRole("teacher");
    setTeacherAuthOpen(false);
  };

  const handleTeacherRegister = async (fullName, email, password) => {
    await api.teacherRegister(fullName, email, password);
  };

  const handleTeacherGoogleLogin = async (idToken) => {
    const response = await api.teacherGoogleLogin(idToken);
    session.saveTeacher(response.accessToken, response.teacher.id);
    setTeacherId(response.teacher.id);
    setRole("teacher");
    setTeacherAuthOpen(false);
  };

  const refreshOpenRaces = async () => {
    setOpenRacesLoading(true);
    setOpenRacesError("");
    try {
      const races = await api.listOpenRaces();
      setOpenRaces(races);
    } catch (error) {
      setOpenRacesError(error.message || "לא ניתן לטעון מרוצים פתוחים.");
      throw error;
    } finally {
      setOpenRacesLoading(false);
    }
  };

  const openGeneralJoin = (initialRoomCode = "") => {
    setJoinMode("general");
    setJoinPreset(initialRoomCode ? { roomCode: initialRoomCode.toUpperCase(), title: "" } : null);
    setStudentView("join");
  };

  const openSpecificJoin = (roomCode, title = "מרוץ") => {
    setJoinMode("specific");
    setJoinPreset({ roomCode: roomCode.toUpperCase(), title });
    setStudentView("join");
  };

  const backToStudentDashboard = () => {
    setStudentView("dashboard");
    setJoinPreset(null);
  };

  const handleStudentJoin = async (roomCode, displayName) => {
    const res = await runAction(() => api.joinRace(roomCode, displayName), "נרשמת בהצלחה");
    session.saveStudent(
      res.studentToken,
      res.participant.participantId,
      res.room.roomCode,
      res.participant.participantStatus,
      displayName
    );
    setRole("student");
    setStudentDisplayName(displayName);
    setStudentRoomCode(res.room.roomCode);
    setStudentParticipantId(res.participant.participantId);
    setStudentParticipantStatus(res.participant.participantStatus);
    setStudentRoomStatus(res.room.status);
    await refreshOpenRaces();

    const isActiveInRunningRace =
      res.room.status === "RUNNING" && res.participant.participantStatus === "ACTIVE";
    setStudentView(isActiveInRunningRace ? "race" : "race");
    setStudentRacePaused(res.room.status === "PAUSED");
    setStudentEventMessage(
      res.participant.participantStatus === "PENDING" ? "נרשמת בהצלחה. ממתין לאישור מורה..." : null
    );
    if (isActiveInRunningRace) {
      await fetchNextQuestion(res.room.roomCode);
    }
  };

  const handleCreateRace = async (payload) => {
    const room = await runAction(() => api.createRace(payload), "המרוץ נוצר בהצלחה");
    setIsCreatingRace(false);
    setIsEditingRace(false);
    setActiveRoomCode(null);
    setRoomMeta(null);
    setParticipants([]);
    setLeaderboard([]);
    setLastCreatedRoomCode(room.roomCode);
    await refreshTeacherRooms();
  };

  const handleUpdateRace = async (payload) => {
    if (!activeRoomCode) return;
    await runAction(() => api.updateRace(activeRoomCode, payload), "המרוץ עודכן");
    setIsEditingRace(false);
    await loadRoomDetails(activeRoomCode);
    await refreshTeacherRooms();
  };

  const loadRoomDetails = async (roomCode) => {
    const detail = await api.roomDetails(roomCode);
    setIsCreatingRace(false);
    setIsEditingRace(false);
    setTeacherFinalRows(null);
    setTeacherWinnerName(null);
    setActiveRoomCode(roomCode);
    setRoomMeta(detail);
    setParticipants(detail.participants);
    setTeacherEventFeed([]);
    setTeacherEventMessage(null);

    if (detail.status === "RUNNING" || detail.status === "PAUSED") {
      const board = await api.leaderboard(roomCode);
      setLeaderboard(board);
    } else if (detail.status === "FINISHED") {
      const results = await api.finalResults(roomCode);
      setTeacherFinalRows(results.leaderboard);
      setTeacherWinnerName(results.winnerName);
      setLeaderboard([]);
    } else {
      setLeaderboard([]);
    }
  };

  const syncTeacherRoomDetails = useCallback(async (roomCode) => {
    if (!roomCode) return;
    const detail = await api.roomDetails(roomCode);
    setRoomMeta(detail);
    setParticipants(detail.participants);

    if (detail.status === "RUNNING" || detail.status === "PAUSED") {
      const board = await api.leaderboard(roomCode);
      setLeaderboard(board);
    } else if (detail.status === "FINISHED") {
      const results = await api.finalResults(roomCode);
      setTeacherFinalRows(results.leaderboard);
      setTeacherWinnerName(results.winnerName);
      setLeaderboard([]);
    } else {
      setLeaderboard([]);
    }
  }, []);

  useEffect(() => {
    if (role !== "teacher" || !teacherId || !activeRoomCode || teacherFinalRows) return;
    const timer = window.setInterval(() => {
      void syncTeacherRoomDetails(activeRoomCode).catch(() => {});
    }, 3000);
    return () => window.clearInterval(timer);
  }, [activeRoomCode, role, syncTeacherRoomDetails, teacherFinalRows, teacherId]);

  const openTeacherRoom = async (roomCode) => {
    setTeacherError("");
    setOpeningRoomCode(roomCode);
    try {
      await loadRoomDetails(roomCode);
    } catch (error) {
      setTeacherError(error.message || "לא ניתן לפתוח את המרוץ לניהול.");
    } finally {
      setOpeningRoomCode(null);
    }
  };

  const startRace = async () => {
    if (!activeRoomCode) return;
    await runAction(async () => {
      await api.startRace(activeRoomCode);
      setRoomMeta((prev) => (prev ? { ...prev, status: "RUNNING" } : prev));
      const board = await api.leaderboard(activeRoomCode);
      setLeaderboard(board);
      setParticipants((prev) => prev.filter((p) => p.participantStatus === "ACTIVE"));
      await loadRoomDetails(activeRoomCode);
    }, "המרוץ התחיל!");
  };

  const pauseRace = async () => {
    if (!activeRoomCode) return;
    await runAction(async () => {
      await api.pauseRace(activeRoomCode);
      await loadRoomDetails(activeRoomCode);
    }, "המרוץ הושהה");
  };

  const resumeRace = async () => {
    if (!activeRoomCode) return;
    await runAction(async () => {
      await api.resumeRace(activeRoomCode);
      await loadRoomDetails(activeRoomCode);
    }, "המרוץ חודש");
  };

  const endRace = async () => {
    if (!activeRoomCode) return;
    await runAction(async () => {
      await api.endRace(activeRoomCode);
      const results = await api.finalResults(activeRoomCode);
      setTeacherFinalRows(results.leaderboard);
      setTeacherWinnerName(results.winnerName);
    }, "המרוץ הסתיים");
  };

  const approveParticipant = async (participantId) => {
    if (!activeRoomCode) return;
    await runAction(async () => {
      try {
        await api.approveParticipant(activeRoomCode, participantId);
        await loadRoomDetails(activeRoomCode);
      } catch (error) {
        await loadRoomDetails(activeRoomCode);
        const message = String(error?.message || "");
        if (
          message.includes("PARTICIPANT_NOT_FOUND") ||
          message.includes("המשתתף לא נמצא") ||
          message.toLowerCase().includes("not found")
        ) {
          throw new Error("התלמיד ביטל את ההרשמה ואינו ברשימה יותר");
        }
        throw error;
      }
    }, "התלמיד אושר");
  };

  const rejectParticipant = async (participantId) => {
    if (!activeRoomCode) return;
    await runAction(async () => {
      await api.rejectParticipant(activeRoomCode, participantId);
      await loadRoomDetails(activeRoomCode);
    }, "ההרשמה נדחתה");
  };

  const removeParticipant = async (participantId) => {
    if (!activeRoomCode) return;
    const previous = participants;
    setParticipants((prev) => prev.filter((p) => p.participantId !== participantId));
    await runAction(async () => {
      try {
        await api.removeParticipant(activeRoomCode, participantId);
        await loadRoomDetails(activeRoomCode);
      } catch (error) {
        setParticipants(previous);
        await loadRoomDetails(activeRoomCode).catch(() => {});
        const message = String(error?.message || "");
        if (message.includes("ROOM_NOT_EDITABLE") || message.includes("לפני תחילת המרוץ") || message.includes("before the race")) {
          throw new Error("לא ניתן למחוק — המרוץ כבר התחיל או שהחדר כבר לא בלובי. רעננתי את המסך.");
        }
        throw error;
      }
    }, "התלמיד נמחק");
  };

  const requestRaceRemoval = (room) => {
    if (room.status === "RUNNING") {
      showToast("לא ניתן להסיר מירוץ שרץ כרגע");
      return;
    }
    setRaceRemovalCandidate(room);
  };

  const cancelRaceRemoval = () => {
    setRaceRemovalCandidate(null);
  };

  const confirmRaceRemoval = async () => {
    const room = raceRemovalCandidate;
    if (!room?.roomCode) return;
    setRemovingRoomCode(room.roomCode);
    try {
      await api.deleteRace(room.roomCode);
      setRooms((prev) => prev.filter((item) => item.roomCode !== room.roomCode));
      if (lastCreatedRoomCode === room.roomCode) {
        setLastCreatedRoomCode(null);
      }
      await refreshTeacherRooms();
      showToast("המירוץ הוסר", "success");
      setRaceRemovalCandidate(null);
    } catch (error) {
      showToast(error.message || "לא ניתן להסיר את המירוץ");
    } finally {
      setRemovingRoomCode(null);
    }
  };

  const addStudent = async (email) => {
    if (!activeRoomCode) return;
    await runAction(async () => {
      await api.addStudent(activeRoomCode, email);
      await loadRoomDetails(activeRoomCode);
    }, "התלמיד נוסף");
  };

  const showFinalResultsForRoom = useCallback(async (roomCode, preset = null) => {
    if (!roomCode) return;
    const applyResults = (results) => {
      if (role === "teacher") {
        setTeacherFinalRows(results.leaderboard);
        setTeacherWinnerName(results.winnerName);
        setRoomMeta((prev) => (prev ? { ...prev, status: "FINISHED" } : prev));
      } else {
        setStudentFinalRows(results.leaderboard);
        setStudentWinnerName(results.winnerName);
        setStudentRoomStatus("FINISHED");
        setStudentQuestion(null);
        setPendingPathDecision(false);
        setStudentRacePaused(false);
        setStudentParticipantStatus("FINISHED");
      }
    };

    if (Array.isArray(preset?.leaderboard) && preset.leaderboard.length > 0) {
      applyResults({
        leaderboard: preset.leaderboard,
        winnerName: preset.winnerName || ""
      });
      return;
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const results = await api.finalResults(roomCode);
        if (Array.isArray(results.leaderboard)) {
          applyResults(results);
          return;
        }
      } catch {
        // Results may not be readable yet right after finish; retry briefly.
      }
      await new Promise((resolve) => window.setTimeout(resolve, 300 * (attempt + 1)));
    }
  }, [role]);

  const answerQuestion = async (answer, responseTimeMs) => {
    if (!studentRoomCode || !studentParticipantId || !studentQuestion || studentRacePaused || pendingPathDecision) return;
    if (questionBusyRef.current) return;
    questionBusyRef.current = true;
    const answeredQuestionId = studentQuestion.questionId;
    handledQuestionIdsRef.current.add(answeredQuestionId);
    try {
      const res = await api.submitAnswer(studentRoomCode, {
        questionId: answeredQuestionId,
        submittedAnswer: answer,
        responseTimeMs
      });
      setStudentProgress(res.newProgress);
      setStudentScore(res.newScore);
      setStudentEventMessage(res.triggeredEvent?.message || null);
      setAnswerFeedback(res.correct ? "correct-flash" : "wrong-flash");
      window.setTimeout(() => setAnswerFeedback(null), 500);

      if (Number(res.newProgress) >= 1000) {
        pendingPathDecisionRef.current = false;
        setPendingPathDecision(false);
        setStudentQuestion(null);
        await showFinalResultsForRoom(studentRoomCode);
        return;
      }

      const hasPathDecision = res.triggeredEvent?.type === "PATH_DECISION";
      pendingPathDecisionRef.current = hasPathDecision;
      setPendingPathDecision(hasPathDecision);
      if (hasPathDecision) {
        setStudentQuestion(null);
        return;
      }
      setStudentQuestion(null);
      if (res.triggeredEvent?.type === "STALLED") {
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
      }
      await fetchNextQuestion(studentRoomCode, { advance: true });
    } catch (error) {
      const message = String(error?.message || "");
      const raceEnded =
        message.includes("ROOM_NOT_RUNNING") ||
        message.includes("המרוץ אינו פעיל") ||
        message.includes("RACE_TIMEOUT") ||
        message.includes("זמן המרוץ הסתיים");

      pendingPathDecisionRef.current = false;
      setPendingPathDecision(false);

      if (raceEnded && studentRoomCode) {
        setStudentQuestion(null);
        await showFinalResultsForRoom(studentRoomCode);
        return;
      }

      const shouldContinue =
        !answer ||
        message.includes("QUESTION_ALREADY_ANSWERED") ||
        message.includes("השאלה כבר נענתה") ||
        message.includes("שגיאת מערכת");

      if (shouldContinue && studentRoomCode) {
        setStudentQuestion(null);
        await fetchNextQuestion(studentRoomCode, { advance: true });
        return;
      }
      showToast(error.message || "שליחת התשובה נכשלה");
      throw error;
    } finally {
      questionBusyRef.current = false;
    }
  };

  const swapQuestion = async () => {
    if (!studentRoomCode || !studentQuestion || pendingPathDecision) return;
    try {
      const q = await api.swapQuestion(studentRoomCode, studentQuestion.questionId);
      setStudentQuestion(q);
      setStudentEventMessage("השאלה הוחלפה");
    } catch (error) {
      showToast(error.message || "החלפת השאלה נכשלה");
    }
  };

  const choosePath = async (choice) => {
    if (!studentRoomCode || !studentParticipantId || !pendingPathDecision) return;
    questionBusyRef.current = true;
    pendingPathDecisionRef.current = false;
    setPendingPathDecision(false);
    setStudentQuestion(null);
    try {
      await api.choosePath(studentRoomCode, choice);
      await fetchNextQuestion(studentRoomCode, { advance: true });
    } catch (error) {
      showToast(error.message || "בחירת המסלול נכשלה");
    } finally {
      questionBusyRef.current = false;
    }
  };

  const finishPathDecisionByTimeout = useCallback(async () => {
    if (!studentRoomCode || !studentParticipantId) {
      pendingPathDecisionRef.current = false;
      setPendingPathDecision(false);
      return;
    }
    questionBusyRef.current = true;
    pendingPathDecisionRef.current = false;
    setPendingPathDecision(false);
    setStudentQuestion(null);
    try {
      await api.choosePath(studentRoomCode, "NORMAL");
    } catch {
      // If the backend no longer has a pending decision, continue to the next question.
    }
    try {
      await fetchNextQuestion(studentRoomCode, { advance: true });
    } finally {
      questionBusyRef.current = false;
    }
  }, [fetchNextQuestion, studentParticipantId, studentRoomCode]);

  const logoutTeacher = () => {
    session.clearTeacher();
    setTeacherId(null);
    setRole("student");
    resetTeacherFlow();
  };

  const requestLogout = (type) => {
    setPendingLogout(type);
    setLogoutConfirmOpen(true);
  };

  const cancelLogout = () => {
    setLogoutConfirmOpen(false);
    setPendingLogout(null);
  };

  const confirmLogout = () => {
    if (pendingLogout === "teacher") logoutTeacher();
    if (pendingLogout === "student") resetStudentFlow();
    cancelLogout();
  };

  const resetTeacherFlow = () => {
    setTeacherFinalRows(null);
    setTeacherWinnerName(null);
    setActiveRoomCode(null);
    setRoomMeta(null);
    setParticipants([]);
    setLeaderboard([]);
    setTeacherEventFeed([]);
    setTeacherEventMessage(null);
    setTeacherError("");
    setOpeningRoomCode(null);
    setIsCreatingRace(false);
    setIsEditingRace(false);
  };

  const clearStudentLocalState = () => {
    session.clearStudent();
    setStudentDisplayName("");
    setStudentRoomCode(null);
    setStudentParticipantId(null);
    setStudentParticipantStatus(null);
    setStudentRoomStatus(null);
    setStudentQuestion(null);
    setStudentProgress(0);
    setStudentScore(0);
    pendingPathDecisionRef.current = false;
    questionBusyRef.current = false;
    currentQuestionIdRef.current = null;
    setPendingPathDecision(false);
    setStudentEventMessage(null);
    setStudentFinalRows(null);
    setStudentWinnerName(null);
    setStudentView("dashboard");
    setStudentRacePaused(false);
  };

  const leaveStudentRace = async () => {
    const roomCode = studentRoomCode;
    if (roomCode && session.getStudentToken()) {
      try {
        await api.leaveRace(roomCode);
      } catch {
        // Still clear local session if the server already removed the registration.
      }
    }
    clearStudentLocalState();
    void refreshOpenRaces();
  };

  const resetStudentFlow = () => {
    clearStudentLocalState();
    void refreshOpenRaces();
  };

  const teacherRoomStatus = roomMeta?.status;
  const showTeacherLobby =
    teacherId &&
    activeRoomCode &&
    !isEditingRace &&
    !teacherFinalRows &&
    (teacherRoomStatus === "LOBBY" || teacherRoomStatus === "LOCKED");
  const showTeacherLive =
    teacherId &&
    activeRoomCode &&
    !isEditingRace &&
    !teacherFinalRows &&
    (teacherRoomStatus === "RUNNING" || teacherRoomStatus === "PAUSED");

  const handleStreamEvent = (event) => {
    const payload = event.payload || {};
    if (event.type === "position_update") {
      const participantId = Number(payload.participantId);
      const progress = Number(payload.progress);
      setParticipants((prev) =>
        prev.map((p) => (p.participantId === participantId ? { ...p, progressPoints: progress } : p))
      );
      if (studentParticipantId && participantId === studentParticipantId) {
        setStudentProgress(progress);
      }
    }
    if (event.type === "leaderboard_update") {
      const rows = payload.leaderboard;
      if (rows) setLeaderboard(rows);
    }
    if (event.type === "game_event") {
      const msg = String(payload.message || "");
      const type = String(payload.type || "game_event");
      if (role === "teacher") pushTeacherEvent(type, msg);
      else setStudentEventMessage(msg);
    }
    if (event.type === "bonus") {
      const msg = String(payload.message || "התקבל בונוס");
      if (role === "teacher") pushTeacherEvent("bonus", msg);
      else setStudentEventMessage(msg);
    }
    if (event.type === "overtake") {
      const msg = `${payload.displayName} עקף למקום ${payload.toRank}`;
      if (role === "teacher") pushTeacherEvent("overtake", msg);
      else setStudentEventMessage(msg);
    }
    if (event.type === "registration_requested" && role === "teacher" && activeRoomCode) {
      void syncTeacherRoomDetails(activeRoomCode);
      void refreshTeacherRooms();
    }
    if (event.type === "registration_approved") {
      if (role === "teacher" && activeRoomCode) {
        void syncTeacherRoomDetails(activeRoomCode);
        void refreshTeacherRooms();
      }
      if (studentParticipantId && Number(payload.participantId) === studentParticipantId) {
        setStudentParticipantStatus("ACTIVE");
        session.saveStudent(
          session.getStudentToken(),
          studentParticipantId,
          studentRoomCode,
          "ACTIVE",
          studentDisplayName
        );
        setStudentRoomStatus((prev) => prev || "LOBBY");
        if (
          studentRoomCode &&
          !studentQuestion &&
          (studentRoomStatus === "RUNNING" || studentRoomStatus === "PAUSED")
        ) {
          void fetchNextQuestion(studentRoomCode);
        }
        setStudentEventMessage("אושרת למרוץ!");
        setStudentView("race");
      }
    }
    if (event.type === "registration_rejected") {
      const rejectedId = Number(payload.participantId);
      if (!Number.isNaN(rejectedId)) {
        setParticipants((prev) => prev.filter((p) => p.participantId !== rejectedId));
      }
      if (role === "teacher" && activeRoomCode) {
        void syncTeacherRoomDetails(activeRoomCode);
        void refreshTeacherRooms();
      }
      if (studentParticipantId && rejectedId === studentParticipantId) {
        resetStudentFlow();
        setStudentAlert({
          title: "שים לב",
          message: "המורה לא אישר את ההרשמה שלך"
        });
      }
    }
    if (event.type === "registration_cancelled") {
      const leftId = Number(payload.participantId);
      if (!Number.isNaN(leftId)) {
        setParticipants((prev) => prev.filter((p) => p.participantId !== leftId));
      }
      if (role === "teacher" && activeRoomCode) {
        void syncTeacherRoomDetails(activeRoomCode);
        void refreshTeacherRooms();
        const name = payload.displayName ? String(payload.displayName) : "תלמיד";
        pushTeacherEvent("registration_cancelled", `${name} ביטל/ה את ההרשמה`);
        showToast(`${name} ביטל/ה את ההרשמה`, "info");
      }
    }
    if (event.type === "room_state") {
      if (role === "teacher") {
        setRoomMeta((prev) =>
          prev && payload.status
            ? {
                ...prev,
                status: payload.status,
                startAt: payload.startAt ?? prev.startAt,
                raceDurationMinutes: payload.raceDurationMinutes ?? prev.raceDurationMinutes
              }
            : prev
        );
      }
      if (role === "student") {
        applyStudentRoomState(payload);
      }
    }
    if (event.type === "race_started") {
      if (role === "teacher") {
        pushTeacherEvent("race_started", "המרוץ התחיל!");
        setRoomMeta((prev) =>
          prev
            ? {
                ...prev,
                status: "RUNNING",
                startAt: payload.startAt ?? prev.startAt,
                raceDurationMinutes: payload.raceDurationMinutes ?? prev.raceDurationMinutes
              }
            : prev
        );
        if (activeRoomCode) void syncTeacherRoomDetails(activeRoomCode);
      }
      if (role === "student") {
        applyStudentRoomState({
          ...payload,
          status: "RUNNING"
        });
      }
    }
    if (event.type === "room_locked") {
      setRoomMeta((prev) => (prev ? { ...prev, status: "LOCKED" } : prev));
      if (role === "student") setStudentRoomStatus("LOCKED");
    }
    if (event.type === "room_unlocked") {
      setRoomMeta((prev) => (prev ? { ...prev, status: "LOBBY" } : prev));
      if (role === "student") setStudentRoomStatus("LOBBY");
    }
    if (event.type === "race_paused") {
      if (activeRoomCode) void syncTeacherRoomDetails(activeRoomCode);
      if (role === "student") {
        setStudentRoomStatus("PAUSED");
        setStudentRacePaused(true);
      }
    }
    if (event.type === "race_resumed") {
      if (activeRoomCode) void syncTeacherRoomDetails(activeRoomCode);
      if (role === "student") {
        setStudentRoomStatus("RUNNING");
        setStudentRacePaused(false);
        if (studentRoomCode && studentParticipantId && studentParticipantStatus === "ACTIVE" && !pendingPathDecisionRef.current && !questionBusyRef.current) {
          void fetchNextQuestion(studentRoomCode);
        }
      }
    }
    if (event.type === "race_finished") {
      const roomCode = event.roomCode;
      const payload = event.payload || {};
      void showFinalResultsForRoom(roomCode, {
        leaderboard: payload.leaderboard,
        winnerName: payload.winnerName
      });
    }
  };

  return (
    <main className="app-shell" dir="rtl">
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
      <TeacherAuthModal
        open={teacherAuthOpen}
        onClose={() => setTeacherAuthOpen(false)}
        onTeacherLogin={handleTeacherLogin}
        onTeacherRegister={handleTeacherRegister}
        onGoogleLogin={handleTeacherGoogleLogin}
        onResetPasswordDirect={(email, password) => api.teacherResetPasswordDirect(email, password)}
      />
      <ConfirmDialog
        open={logoutConfirmOpen}
        title="התנתקות"
        message="האם אתה בטוח שברצונך להתנתק?"
        confirmText="התנתק"
        cancelText="ביטול"
        danger
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
      />
      <ConfirmDialog
        open={Boolean(raceRemovalCandidate)}
        title="הסרת מירוץ"
        message="האם אתה בטוח שברצונך להסיר את המירוץ?"
        confirmText="הסר"
        cancelText="ביטול"
        danger
        onConfirm={confirmRaceRemoval}
        onCancel={cancelRaceRemoval}
      />
      <ConfirmDialog
        open={Boolean(studentAlert)}
        title={studentAlert?.title || ""}
        message={studentAlert?.message || ""}
        confirmText="הבנתי"
        hideCancel
        onConfirm={() => setStudentAlert(null)}
      />
      <FloatingNumbersBackground />

      <div className="app">
        <AppChrome
          brand="מרוץ חשבון"
          subtitle="תחרות מתמטיקה בזמן אמת לכיתה"
          theme={theme}
          onToggleTheme={toggleTheme}
          actions={
            <>
              {role === "student" && studentView === "join" ? (
                <Button variant="ghost" size="sm" onClick={backToStudentDashboard}>
                  בחזרה לדשבורד
                </Button>
              ) : null}
              {teacherId ? (
                <>
                  {role === "teacher" ? (
                    <Button variant="ghost" size="sm" onClick={() => setRole("student")}>
                      מסך תלמידים
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setRole("teacher")}>
                      לוח מורה
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => requestLogout("teacher")}>
                    יציאת מורה
                  </Button>
                </>
              ) : (
                <Button variant="primary" size="sm" onClick={() => setTeacherAuthOpen(true)}>
                  התחברות / הרשמה — מורה
                </Button>
              )}
              {role === "student" && studentView !== "dashboard" && !studentFinalRows ? (
                <Button variant="ghost" size="sm" onClick={() => setStudentView("dashboard")}>
                  חזרה
                </Button>
              ) : null}
            </>
          }
        />

      {role === "teacher" && teacherId ? (
        <>
          {!isCreatingRace && !isEditingRace && !activeRoomCode && !teacherFinalRows ? (
            <TeacherDashboard
              rooms={rooms}
              lastCreatedRoomCode={lastCreatedRoomCode}
              openingRoomCode={openingRoomCode}
              removingRoomCode={removingRoomCode}
              errorMessage={teacherError}
              onCreateRace={() => setIsCreatingRace(true)}
              onOpenRoom={(roomCode) => void openTeacherRoom(roomCode)}
              onRemoveRoom={requestRaceRemoval}
            />
          ) : null}

          {isCreatingRace ? (
            <CreateRace onSubmit={handleCreateRace} onCancel={() => setIsCreatingRace(false)} />
          ) : null}

          {isEditingRace && roomMeta ? (
            <CreateRace
              mode="edit"
              initialValues={roomMeta}
              onSubmit={handleUpdateRace}
              onCancel={() => setIsEditingRace(false)}
            />
          ) : null}

          {showTeacherLobby ? (
            <RaceLobby
              roomCode={activeRoomCode}
              roomStatus={roomMeta?.status}
              participants={participants}
              eventMessage={teacherEventMessage}
              onApproveParticipant={approveParticipant}
              onRejectParticipant={rejectParticipant}
              onRemoveParticipant={removeParticipant}
              onAddStudent={addStudent}
              onStartRace={startRace}
              onBack={resetTeacherFlow}
              onEditRace={() => setIsEditingRace(true)}
            />
          ) : null}

          {showTeacherLive ? (
            <LiveRaceDashboard
              roomCode={activeRoomCode}
              roomStatus={roomMeta?.status}
              startAt={roomMeta?.startAt}
              raceDurationMinutes={roomMeta?.raceDurationMinutes}
              participants={participants.filter((p) => p.participantStatus === "ACTIVE")}
              leaderboard={leaderboard}
              eventMessage={teacherEventMessage}
              eventFeed={teacherEventFeed}
              onEndRace={endRace}
              onPauseRace={pauseRace}
              onResumeRace={resumeRace}
              onBack={resetTeacherFlow}
            />
          ) : null}

          {teacherFinalRows ? (
            <FinalResults rows={teacherFinalRows} winnerName={teacherWinnerName} onReset={resetTeacherFlow} />
          ) : null}
        </>
      ) : (
        <>
          {studentView === "join" ? (
            <StudentJoin
              mode={joinMode}
              presetRoomCode={joinPreset?.roomCode || joinRoomCode || ""}
              presetRaceTitle={joinPreset?.title || ""}
              onJoin={handleStudentJoin}
              onBack={backToStudentDashboard}
            />
          ) : null}
          {studentView === "dashboard" && !studentFinalRows ? (
            <StudentDashboard
              displayName={studentDisplayName}
              openRaces={openRaces}
              loading={openRacesLoading}
              errorMessage={openRacesError}
              activeRoomCode={studentRoomCode}
              activeParticipantStatus={studentParticipantStatus}
              onRefresh={() => void refreshOpenRaces()}
              onJoinGeneral={() => openGeneralJoin()}
              onJoinSpecific={openSpecificJoin}
              onEnterRace={() => {
                if (studentParticipantStatus === "ACTIVE") {
                  setStudentView("race");
                  if (studentRoomCode && !studentQuestion) {
                    void fetchNextQuestion(studentRoomCode);
                  }
                }
              }}
              onLeaveRace={studentRoomCode ? leaveStudentRace : undefined}
            />
          ) : null}
          {studentRoomCode && studentView === "race" && studentParticipantStatus === "PENDING" && !studentFinalRows ? (
            <section className="surface-card centered waiting-card premium-waiting">
              <div className="waiting-icon" aria-hidden="true">⏳</div>
              <h3>ממתין לאישור מורה</h3>
              <p className="room-code-display">{studentRoomCode}</p>
              <p className="muted">{studentEventMessage || "נרשמת בהצלחה. המתן לאישור."}</p>
              <Button variant="ghost" onClick={() => void leaveStudentRace()}>
                ביטול הרשמה
              </Button>
            </section>
          ) : null}
          {studentRoomCode && studentView === "race" && studentParticipantStatus === "ACTIVE" && !studentFinalRows ? (
            <StudentRaceScreen
              roomCode={studentRoomCode}
              raceStatus={studentRoomStatus}
              progress={studentProgress}
              score={studentScore}
              question={studentQuestion}
              eventMessage={studentEventMessage}
              pendingPathDecision={pendingPathDecision}
              answerFeedback={answerFeedback}
              racePaused={studentRacePaused}
              onAnswer={answerQuestion}
              onChoosePath={choosePath}
              onDecisionTimeout={finishPathDecisionByTimeout}
              onSwapQuestion={swapQuestion}
              onLeaveRace={leaveStudentRace}
            />
          ) : null}
          {studentFinalRows ? (
            <FinalResults rows={studentFinalRows} winnerName={studentWinnerName} onReset={resetStudentFlow} />
          ) : null}
        </>
        )}
      </div>
    </main>
  );
}

export default App;
