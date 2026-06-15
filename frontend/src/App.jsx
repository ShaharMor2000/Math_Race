import { useCallback, useEffect, useState } from "react";
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
  const [role, setRole] = useState(() => (session.getTeacherId() ? "teacher" : "student"));
  const [teacherId, setTeacherId] = useState(session.getTeacherId());
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
  const [teacherAuthOpen, setTeacherAuthOpen] = useState(false);

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

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("mathRaceTheme", theme);
  }, [theme]);

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
    if (!teacherId) return;
    void refreshTeacherRooms();
  }, [teacherId, role]);

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

  const fetchNextQuestion = useCallback(async (roomCode, attempt = 0) => {
    try {
      const q = await api.nextQuestion(roomCode);
      setStudentQuestion(q);
    } catch (error) {
      const message = String(error?.message || "");
      if (message.includes("VEHICLE_FROZEN") && attempt < 4) {
        setStudentEventMessage("הרכב נעצר לרגע אחרי כישלון באוטוסטרדה...");
        window.setTimeout(() => void fetchNextQuestion(roomCode, attempt + 1), 3000);
        return;
      }
    }
  }, []);

  useEffect(() => {
    if (role !== "student" || !studentRoomCode || studentParticipantStatus !== "ACTIVE") return;
    if (studentRoomStatus === "RUNNING" || studentRoomStatus === "PAUSED") {
      setStudentView("race");
      setStudentRacePaused(studentRoomStatus === "PAUSED");
      if (studentRoomStatus === "RUNNING" && !studentQuestion) {
        void fetchNextQuestion(studentRoomCode);
      }
    }
  }, [role, studentRoomCode, studentParticipantStatus, studentRoomStatus, studentQuestion, fetchNextQuestion]);

  useEffect(() => {
    if (!studentRoomCode || !studentParticipantId || studentParticipantStatus !== "ACTIVE") return;
    if (studentQuestion || studentFinalRows) return;
    void fetchNextQuestion(studentRoomCode);
  }, [studentRoomCode, studentParticipantId, studentParticipantStatus, studentQuestion, studentFinalRows, fetchNextQuestion]);

  const refreshTeacherRooms = async () => {
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
    await handleTeacherLogin(email, password);
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
      await api.approveParticipant(activeRoomCode, participantId);
      await loadRoomDetails(activeRoomCode);
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
    await runAction(async () => {
      await api.removeParticipant(activeRoomCode, participantId);
      await loadRoomDetails(activeRoomCode);
    }, "התלמיד נמחק");
  };

  const addStudent = async (email) => {
    if (!activeRoomCode) return;
    await runAction(async () => {
      await api.addStudent(activeRoomCode, email);
      await loadRoomDetails(activeRoomCode);
    }, "התלמיד נוסף");
  };

  const answerQuestion = async (answer, responseTimeMs) => {
    if (!studentRoomCode || !studentParticipantId || !studentQuestion || studentRacePaused) return;
    try {
      const res = await api.submitAnswer(studentRoomCode, {
        questionId: studentQuestion.questionId,
        submittedAnswer: answer,
        responseTimeMs
      });
      setStudentProgress(res.newProgress);
      setStudentScore(res.newScore);
      setStudentEventMessage(res.triggeredEvent?.message || null);
      setAnswerFeedback(res.correct ? "correct-flash" : "wrong-flash");
      window.setTimeout(() => setAnswerFeedback(null), 500);

      const hasPathDecision = res.triggeredEvent?.type === "PATH_DECISION";
      setPendingPathDecision(hasPathDecision);
      if (!hasPathDecision) {
        await fetchNextQuestion(studentRoomCode);
      } else {
        setStudentQuestion(null);
      }
    } catch (error) {
      const message = String(error?.message || "");
      const shouldContinue =
        !answer ||
        message.includes("QUESTION_ALREADY_ANSWERED") ||
        message.includes("Question already answered") ||
        message.includes("API error");

      setStudentQuestion(null);
      setPendingPathDecision(false);
      if (shouldContinue && studentRoomCode) {
        await fetchNextQuestion(studentRoomCode);
        return;
      }
      showToast(error.message || "שליחת התשובה נכשלה");
    }
  };

  const swapQuestion = async () => {
    if (!studentRoomCode || !studentQuestion) return;
    try {
      const q = await api.swapQuestion(studentRoomCode, studentQuestion.questionId);
      setStudentQuestion(q);
      setStudentEventMessage("השאלה הוחלפה");
    } catch (error) {
      showToast(error.message || "החלפת השאלה נכשלה");
    }
  };

  const choosePath = async (choice) => {
    if (!studentRoomCode || !studentParticipantId) return;
    try {
      await api.choosePath(studentRoomCode, choice);
      setPendingPathDecision(false);
      await fetchNextQuestion(studentRoomCode);
    } catch (error) {
      showToast(error.message || "בחירת המסלול נכשלה");
    }
  };

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

  const leaveStudentRace = () => {
    session.clearStudent();
    setStudentDisplayName("");
    setStudentRoomCode(null);
    setStudentParticipantId(null);
    setStudentParticipantStatus(null);
    setStudentRoomStatus(null);
    setStudentQuestion(null);
    setStudentProgress(0);
    setStudentScore(0);
    setPendingPathDecision(false);
    setStudentEventMessage(null);
    setStudentFinalRows(null);
    setStudentWinnerName(null);
    setStudentView("dashboard");
    setStudentRacePaused(false);
    void refreshOpenRaces();
  };

  const resetStudentFlow = () => {
    leaveStudentRace();
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
      const msg = String(payload.message || "Bonus received");
      if (role === "teacher") pushTeacherEvent("bonus", msg);
      else setStudentEventMessage(msg);
    }
    if (event.type === "overtake") {
      const msg = `${payload.displayName} עקף למקום ${payload.toRank}`;
      if (role === "teacher") pushTeacherEvent("overtake", msg);
      else setStudentEventMessage(msg);
    }
    if (event.type === "registration_requested" && role === "teacher" && activeRoomCode) {
      void loadRoomDetails(activeRoomCode);
    }
    if (event.type === "registration_approved") {
      if (role === "teacher" && activeRoomCode) {
        void loadRoomDetails(activeRoomCode);
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
        if (studentRoomCode && !studentQuestion) {
          void fetchNextQuestion(studentRoomCode);
        }
        setStudentEventMessage("אושרת למרוץ!");
        setStudentView("race");
      }
    }
    if (event.type === "registration_rejected") {
      if (role === "teacher" && activeRoomCode) {
        void loadRoomDetails(activeRoomCode);
      }
      if (studentParticipantId && Number(payload.participantId) === studentParticipantId) {
        resetStudentFlow();
        setStudentEventMessage("ההרשמה נדחתה על ידי המורה.");
      }
    }
    if (event.type === "race_started") {
      if (role === "teacher") pushTeacherEvent("race_started", "המרוץ התחיל!");
      if (role === "student") setStudentRoomStatus("RUNNING");
      if (studentRoomCode && studentParticipantId && studentParticipantStatus === "ACTIVE") {
        setStudentRacePaused(false);
        setStudentView("race");
        void fetchNextQuestion(studentRoomCode);
      }
    }
    if (event.type === "race_paused") {
      if (activeRoomCode) void loadRoomDetails(activeRoomCode);
      if (role === "student") {
        setStudentRoomStatus("PAUSED");
        setStudentRacePaused(true);
      }
    }
    if (event.type === "race_resumed") {
      if (activeRoomCode) void loadRoomDetails(activeRoomCode);
      if (role === "student") {
        setStudentRoomStatus("RUNNING");
        setStudentRacePaused(false);
        if (studentRoomCode && studentParticipantId && studentParticipantStatus === "ACTIVE") {
          void fetchNextQuestion(studentRoomCode);
        }
      }
    }
    if (event.type === "race_finished") {
      const roomCode = event.roomCode;
      void api.finalResults(roomCode).then((results) => {
        if (role === "teacher") {
          setTeacherFinalRows(results.leaderboard);
          setTeacherWinnerName(results.winnerName);
        } else {
          setStudentFinalRows(results.leaderboard);
          setStudentWinnerName(results.winnerName);
        }
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
              errorMessage={teacherError}
              onCreateRace={() => setIsCreatingRace(true)}
              onOpenRoom={(roomCode) => void openTeacherRoom(roomCode)}
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
              onSwapQuestion={swapQuestion}
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
