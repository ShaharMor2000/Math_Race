import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CreateRace } from "./components/CreateRace";
import { FinalResults } from "./components/FinalResults";
import { LiveRaceDashboard } from "./components/LiveRaceDashboard";
import { FloatingNumbersBackground, LoginPage } from "./components/LoginPage";
import { RaceLobby } from "./components/RaceLobby";
import { StudentDashboard } from "./components/StudentDashboard";
import { StudentJoin } from "./components/StudentJoin";
import { StudentRaceScreen } from "./components/StudentRaceScreen";
import { TeacherDashboard } from "./components/TeacherDashboard";
import { useRaceStream } from "./hooks/useRaceStream";
import { api } from "./services/api";
import { session } from "./services/session";

function App() {
  const { roomCode: joinRoomCode } = useParams();
  const [theme, setTheme] = useState(() => localStorage.getItem("mathRaceTheme") || "dark");
  const [role, setRole] = useState(joinRoomCode ? "student" : "teacher");
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
  const [studentEmail, setStudentEmail] = useState(session.getStudentEmail());
  const [studentParticipantId, setStudentParticipantId] = useState(session.getStudentParticipantId());
  const [studentParticipantStatus, setStudentParticipantStatus] = useState(session.getStudentStatus());
  const [studentProgress, setStudentProgress] = useState(0);
  const [studentScore, setStudentScore] = useState(0);
  const [studentQuestion, setStudentQuestion] = useState(null);
  const [studentEventMessage, setStudentEventMessage] = useState(null);
  const [pendingPathDecision, setPendingPathDecision] = useState(false);
  const [studentFinalRows, setStudentFinalRows] = useState(null);
  const [studentWinnerName, setStudentWinnerName] = useState(null);
  const [openRaces, setOpenRaces] = useState([]);
  const [answerFeedback, setAnswerFeedback] = useState(null);
  const [studentRaces, setStudentRaces] = useState([]);
  const [studentDashboardLoading, setStudentDashboardLoading] = useState(false);
  const [studentDashboardError, setStudentDashboardError] = useState("");
  const [studentView, setStudentView] = useState("dashboard");

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
    if (role !== "student" || studentRoomCode) return;
    void refreshOpenRaces();
  }, [role, studentRoomCode]);

  useEffect(() => {
    if (role !== "student" || !studentEmail) return;
    void refreshStudentDashboard(studentEmail);
  }, [role, studentEmail]);

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
  };

  const handleTeacherRegister = async (fullName, email, password) => {
    await api.teacherRegister(fullName, email, password);
    await handleTeacherLogin(email, password);
  };

  const handleTeacherGoogleLogin = async (idToken) => {
    const response = await api.teacherGoogleLogin(idToken);
    session.saveTeacher(response.accessToken, response.teacher.id);
    setTeacherId(response.teacher.id);
  };

  const refreshOpenRaces = async () => {
    const races = await api.listOpenRaces();
    setOpenRaces(races);
  };

  const refreshStudentDashboard = async (email = studentEmail) => {
    if (!email) return;
    setStudentDashboardLoading(true);
    setStudentDashboardError("");
    try {
      const races = await api.listStudentRaces(email);
      setStudentRaces(races);
    } catch (error) {
      setStudentDashboardError(error.message || "לא ניתן לטעון את דשבורד התלמיד.");
    } finally {
      setStudentDashboardLoading(false);
    }
  };

  const handleStudentDashboardLogin = async (email) => {
    const normalizedEmail = email.trim();
    session.saveStudentEmail(normalizedEmail);
    setStudentEmail(normalizedEmail);
    setStudentView("dashboard");
    await refreshStudentDashboard(normalizedEmail);
  };

  const handleCreateRace = async (payload) => {
    const room = await api.createRace(payload);
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
    await api.updateRace(activeRoomCode, payload);
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
    await api.startRace(activeRoomCode);
    const board = await api.leaderboard(activeRoomCode);
    setLeaderboard(board);
    setParticipants((prev) => prev.filter((p) => p.participantStatus === "ACTIVE"));
    await loadRoomDetails(activeRoomCode);
  };

  const pauseRace = async () => {
    if (!activeRoomCode) return;
    await api.pauseRace(activeRoomCode);
    await loadRoomDetails(activeRoomCode);
  };

  const resumeRace = async () => {
    if (!activeRoomCode) return;
    await api.resumeRace(activeRoomCode);
    await loadRoomDetails(activeRoomCode);
  };

  const endRace = async () => {
    if (!activeRoomCode) return;
    await api.endRace(activeRoomCode);
    const results = await api.finalResults(activeRoomCode);
    setTeacherFinalRows(results.leaderboard);
    setTeacherWinnerName(results.winnerName);
  };

  const handleStudentJoin = async (roomCode, displayName, email) => {
    const res = await api.joinRace(roomCode, displayName, email);
    session.saveStudent(
      res.studentToken,
      res.participant.participantId,
      res.room.roomCode,
      res.participant.participantStatus,
      email
    );
    setStudentEmail(email);
    setStudentRoomCode(res.room.roomCode);
    setStudentParticipantId(res.participant.participantId);
    setStudentParticipantStatus(res.participant.participantStatus);
    setStudentView("dashboard");
    await refreshStudentDashboard(email);
    setStudentEventMessage(
      res.participant.participantStatus === "PENDING" ? "נרשמת בהצלחה. ממתין לאישור מורה..." : null
    );
    if (res.room.status === "RUNNING" && res.participant.participantStatus === "ACTIVE") {
      await fetchNextQuestion(res.room.roomCode);
    }
  };

  const approveParticipant = async (participantId) => {
    if (!activeRoomCode) return;
    await api.approveParticipant(activeRoomCode, participantId);
    await loadRoomDetails(activeRoomCode);
  };

  const rejectParticipant = async (participantId) => {
    if (!activeRoomCode) return;
    await api.rejectParticipant(activeRoomCode, participantId);
    await loadRoomDetails(activeRoomCode);
  };

  const addStudent = async (displayName) => {
    if (!activeRoomCode) return;
    await api.addStudent(activeRoomCode, displayName);
    await loadRoomDetails(activeRoomCode);
  };

  const answerQuestion = async (answer, responseTimeMs) => {
    if (!studentRoomCode || !studentParticipantId || !studentQuestion) return;
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
  };

  const swapQuestion = async () => {
    if (!studentRoomCode || !studentQuestion) return;
    const q = await api.swapQuestion(studentRoomCode, studentQuestion.questionId);
    setStudentQuestion(q);
    setStudentEventMessage("השאלה הוחלפה");
  };

  const choosePath = async (choice) => {
    if (!studentRoomCode || !studentParticipantId) return;
    await api.choosePath(studentRoomCode, choice);
    setPendingPathDecision(false);
    await fetchNextQuestion(studentRoomCode);
  };

  const logoutTeacher = () => {
    session.clearTeacher();
    setTeacherId(null);
    resetTeacherFlow();
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

  const resetStudentFlow = () => {
    session.clearStudent();
    setStudentEmail(null);
    setStudentFinalRows(null);
    setStudentWinnerName(null);
    setStudentRoomCode(null);
    setStudentParticipantId(null);
    setStudentParticipantStatus(null);
    setStudentQuestion(null);
    setStudentProgress(0);
    setStudentScore(0);
    setPendingPathDecision(false);
    setStudentEventMessage(null);
    setStudentRaces([]);
    setStudentDashboardError("");
    setStudentView("dashboard");
    void refreshOpenRaces();
  };

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
        session.saveStudent(session.getStudentToken(), studentParticipantId, studentRoomCode, "ACTIVE", studentEmail);
        void refreshStudentDashboard(studentEmail);
        setStudentEventMessage("אושרת למרוץ. המתן להתחלה.");
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
      if (studentRoomCode && studentParticipantId && studentParticipantStatus === "ACTIVE") {
        void fetchNextQuestion(studentRoomCode);
      }
    }
    if (event.type === "race_paused" || event.type === "race_resumed") {
      if (activeRoomCode) void loadRoomDetails(activeRoomCode);
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

  const isLoginScreen =
    (role === "teacher" && !teacherId) || (role === "student" && !studentEmail && !studentRoomCode);

  if (isLoginScreen) {
    return (
      <main className="auth-app">
        <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label="Toggle light and dark mode">
          {theme === "dark" ? "Light" : "Dark"}
        </button>
        <LoginPage
          activeRole={role}
          initialRoomCode={joinRoomCode || ""}
          openRaces={openRaces}
          onRoleChange={setRole}
          onTeacherLogin={handleTeacherLogin}
          onTeacherRegister={handleTeacherRegister}
          onGoogleLogin={handleTeacherGoogleLogin}
          onStudentJoin={handleStudentJoin}
          onStudentDashboardLogin={handleStudentDashboardLogin}
          onRefreshOpenRaces={refreshOpenRaces}
        />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label="Toggle light and dark mode">
        {theme === "dark" ? "Light" : "Dark"}
      </button>
      <FloatingNumbersBackground />
      <div className="auth-symbol auth-symbol-one" aria-hidden="true">+</div>
      <div className="auth-symbol auth-symbol-two" aria-hidden="true">*</div>
      <div className="auth-symbol auth-symbol-three" aria-hidden="true">=</div>

      <div className="app">
        <header className="app-header">
          <div className="app-header-brand">
            <h1>Math Race</h1>
            <p>Real-Time Mathematics Competition Platform</p>
          </div>
          <div className="app-header-actions" aria-label="Choose role">
            <div className="app-role-tabs">
              <button
                type="button"
                className={role === "teacher" ? "app-role-tab active" : "app-role-tab"}
                onClick={() => setRole("teacher")}
              >
                Teacher
              </button>
              <button
                type="button"
                className={role === "student" ? "app-role-tab active" : "app-role-tab"}
                onClick={() => setRole("student")}
              >
                Student
              </button>
            </div>
            {teacherId ? (
              <button type="button" className="app-logout-button" onClick={logoutTeacher}>
                Log out
              </button>
            ) : null}
          </div>
        </header>

      {role === "teacher" ? (
        <>
          {teacherId && !isCreatingRace && !isEditingRace && !activeRoomCode && !teacherFinalRows ? (
            <TeacherDashboard
              rooms={rooms}
              lastCreatedRoomCode={lastCreatedRoomCode}
              openingRoomCode={openingRoomCode}
              errorMessage={teacherError}
              onCreateRace={() => setIsCreatingRace(true)}
              onOpenRoom={(roomCode) => void openTeacherRoom(roomCode)}
            />
          ) : null}

          {teacherId && isCreatingRace ? (
            <CreateRace onSubmit={handleCreateRace} onCancel={() => setIsCreatingRace(false)} />
          ) : null}

          {teacherId && isEditingRace && roomMeta ? (
            <CreateRace
              mode="edit"
              initialValues={roomMeta}
              onSubmit={handleUpdateRace}
              onCancel={() => setIsEditingRace(false)}
            />
          ) : null}

          {teacherId && activeRoomCode && !isEditingRace && !leaderboard.length && !teacherFinalRows ? (
            <RaceLobby
              roomCode={activeRoomCode}
              roomStatus={roomMeta?.status}
              participants={participants}
              onApproveParticipant={approveParticipant}
              onRejectParticipant={rejectParticipant}
              onAddStudent={addStudent}
              onStartRace={startRace}
              onBack={resetTeacherFlow}
              onEditRace={() => setIsEditingRace(true)}
            />
          ) : null}

          {teacherId && activeRoomCode && leaderboard.length > 0 && !teacherFinalRows ? (
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
            />
          ) : null}

          {teacherFinalRows ? (
            <FinalResults rows={teacherFinalRows} winnerName={teacherWinnerName} onReset={resetTeacherFlow} />
          ) : null}
        </>
      ) : (
        <>
          {!studentRoomCode && studentView === "join" ? (
            <StudentJoin
              openRaces={openRaces}
              onJoin={handleStudentJoin}
              onRefresh={refreshOpenRaces}
              onDashboardLogin={handleStudentDashboardLogin}
            />
          ) : null}
          {studentEmail && studentView === "dashboard" ? (
            <StudentDashboard
              email={studentEmail}
              races={studentRaces}
              loading={studentDashboardLoading}
              errorMessage={studentDashboardError}
              activeRoomCode={studentRoomCode}
              activeParticipantStatus={studentParticipantStatus}
              onRefresh={() => void refreshStudentDashboard()}
              onEnterRace={() => setStudentView("race")}
              onFindRace={() => {
                const email = studentEmail;
                session.clearStudent();
                if (email) session.saveStudentEmail(email);
                setStudentRoomCode(null);
                setStudentParticipantId(null);
                setStudentParticipantStatus(null);
                setStudentQuestion(null);
                setStudentView("join");
                void refreshOpenRaces();
              }}
              onLogout={resetStudentFlow}
            />
          ) : null}
          {studentRoomCode && studentView === "race" && studentParticipantStatus === "PENDING" && !studentFinalRows ? (
            <section className="card centered">
              <h3>ממתין לאישור מורה</h3>
              <p>קוד חדר: {studentRoomCode}</p>
              <p>{studentEventMessage || "נרשמת בהצלחה. המתן לאישור."}</p>
            </section>
          ) : null}
          {studentRoomCode && studentView === "race" && studentParticipantStatus === "ACTIVE" && !studentFinalRows ? (
            <StudentRaceScreen
              roomCode={studentRoomCode}
              progress={studentProgress}
              score={studentScore}
              question={studentQuestion}
              eventMessage={studentEventMessage}
              pendingPathDecision={pendingPathDecision}
              answerFeedback={answerFeedback}
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
