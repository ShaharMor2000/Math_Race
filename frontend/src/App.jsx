import { useEffect, useState } from "react";
import { CreateRace } from "./components/CreateRace";
import { DocNote } from "./components/DocNote";
import { FinalResults } from "./components/FinalResults";
import { LiveRaceDashboard } from "./components/LiveRaceDashboard";
import { RaceLobby } from "./components/RaceLobby";
import { StudentJoin } from "./components/StudentJoin";
import { StudentRaceScreen } from "./components/StudentRaceScreen";
import { TeacherDashboard } from "./components/TeacherDashboard";
import { TeacherLogin } from "./components/TeacherLogin";
import { useRaceStream } from "./hooks/useRaceStream";
import { api } from "./services/api";

function App() {
  const [role, setRole] = useState("teacher");

  const [teacherId, setTeacherId] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [isCreatingRace, setIsCreatingRace] = useState(false);
  const [activeRoomCode, setActiveRoomCode] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [teacherEventMessage, setTeacherEventMessage] = useState(null);
  const [teacherFinalRows, setTeacherFinalRows] = useState(null);

  const [studentRoomCode, setStudentRoomCode] = useState(null);
  const [studentParticipantId, setStudentParticipantId] = useState(null);
  const [studentParticipantStatus, setStudentParticipantStatus] = useState(null);
  const [studentProgress, setStudentProgress] = useState(0);
  const [studentScore, setStudentScore] = useState(0);
  const [studentQuestion, setStudentQuestion] = useState(null);
  const [studentEventMessage, setStudentEventMessage] = useState(null);
  const [pendingPathDecision, setPendingPathDecision] = useState(false);
  const [studentFinalRows, setStudentFinalRows] = useState(null);
  const [openRaces, setOpenRaces] = useState([]);

  const activeRoomForStream = role === "teacher" ? activeRoomCode : studentRoomCode;
  useRaceStream(activeRoomForStream, (event) => {
    handleStreamEvent(event);
  });

  useEffect(() => {
    if (!teacherId) return;
    void refreshTeacherRooms(teacherId);
  }, [teacherId]);

  useEffect(() => {
    if (role !== "student") return;
    if (studentRoomCode) return;
    void refreshOpenRaces();
  }, [role, studentRoomCode]);

  const refreshTeacherRooms = async (id) => {
    const list = await api.listTeacherRaces(id);
    setRooms(list);
  };

  const handleTeacherLogin = async (email, password) => {
    const response = await api.teacherLogin(email, password);
    setTeacherId(response.teacher.id);
  };

  const handleTeacherGoogleLogin = async (idToken) => {
    const response = await api.teacherGoogleLogin(idToken);
    setTeacherId(response.teacher.id);
  };

  const refreshOpenRaces = async () => {
    const races = await api.listOpenRaces();
    setOpenRaces(races);
  };

  const handleCreateRace = async (payload) => {
    if (!teacherId) return;
    const room = await api.createRace(teacherId, payload);
    setIsCreatingRace(false);
    setActiveRoomCode(room.roomCode);
    await refreshTeacherRooms(teacherId);
    await loadRoomDetails(room.roomCode);
  };

  const loadRoomDetails = async (roomCode) => {
    const detail = await api.roomDetails(roomCode);
    setActiveRoomCode(roomCode);
    setParticipants(detail.participants);
  };

  const startRace = async () => {
    if (!activeRoomCode) return;
    await api.startRace(activeRoomCode);
    const board = await api.leaderboard(activeRoomCode);
    setLeaderboard(board);
    setParticipants((prev) => prev.filter((p) => p.participantStatus === "ACTIVE"));
  };

  const endRace = async () => {
    if (!activeRoomCode) return;
    await api.endRace(activeRoomCode);
    const results = await api.finalResults(activeRoomCode);
    setTeacherFinalRows(results.leaderboard);
  };

  const handleStudentJoin = async (roomCode, displayName) => {
    const res = await api.joinRace(roomCode, displayName);
    setStudentRoomCode(res.room.roomCode);
    setStudentParticipantId(res.participant.participantId);
    setStudentParticipantStatus(res.participant.participantStatus);
    setStudentEventMessage(res.participant.participantStatus === "PENDING" ? "נרשמת בהצלחה. ממתין לאישור מורה..." : null);
    if (res.room.status === "RUNNING") {
      const q = await api.nextQuestion(res.room.roomCode, res.participant.participantId);
      setStudentQuestion(q);
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

  const answerQuestion = async (answer, responseTimeMs) => {
    if (!studentRoomCode || !studentParticipantId || !studentQuestion) return;
    const res = await api.submitAnswer(studentRoomCode, studentParticipantId, {
      questionId: studentQuestion.questionId,
      submittedAnswer: answer,
      responseTimeMs
    });
    setStudentProgress(res.newProgress);
    setStudentScore(res.newScore);
    setStudentEventMessage(res.triggeredEvent?.message || null);
    const hasPathDecision = res.triggeredEvent?.type === "PATH_DECISION";
    setPendingPathDecision(hasPathDecision);
    if (!hasPathDecision) {
      const q = await api.nextQuestion(studentRoomCode, studentParticipantId);
      setStudentQuestion(q);
    }
  };

  const choosePath = async (choice) => {
    if (!studentRoomCode || !studentParticipantId) return;
    await api.choosePath(studentRoomCode, studentParticipantId, choice);
    setPendingPathDecision(false);
    const q = await api.nextQuestion(studentRoomCode, studentParticipantId);
    setStudentQuestion(q);
  };

  const resetTeacherFlow = () => {
    setTeacherFinalRows(null);
    setActiveRoomCode(null);
    setParticipants([]);
    setLeaderboard([]);
  };

  const resetStudentFlow = () => {
    setStudentFinalRows(null);
    setStudentRoomCode(null);
    setStudentParticipantId(null);
    setStudentParticipantStatus(null);
    setStudentQuestion(null);
    setStudentProgress(0);
    setStudentScore(0);
    setPendingPathDecision(false);
    setStudentEventMessage(null);
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
      if (role === "teacher") setTeacherEventMessage(msg);
      else setStudentEventMessage(msg);
    }
    if (event.type === "bonus") {
      const msg = String(payload.message || "Bonus received");
      if (role === "teacher") setTeacherEventMessage(msg);
      else setStudentEventMessage(msg);
    }
    if (event.type === "overtake") {
      const msg = `${payload.displayName} עקף למקום ${payload.toRank}`;
      if (role === "teacher") setTeacherEventMessage(msg);
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
        setStudentEventMessage("אושרת למרוץ. המתן להתחלה.");
      }
    }
    if (event.type === "registration_rejected") {
      if (role === "teacher" && activeRoomCode) {
        void loadRoomDetails(activeRoomCode);
      }
      if (studentParticipantId && Number(payload.participantId) === studentParticipantId) {
        setStudentEventMessage("ההרשמה נדחתה על ידי המורה.");
        setStudentRoomCode(null);
        setStudentParticipantId(null);
        setStudentParticipantStatus(null);
        setStudentQuestion(null);
        void refreshOpenRaces();
      }
    }
    if (event.type === "race_started" && studentRoomCode && studentParticipantId && studentParticipantStatus === "ACTIVE") {
      void api.nextQuestion(studentRoomCode, studentParticipantId).then((q) => setStudentQuestion(q));
    }
    if (event.type === "race_finished") {
      const roomCode = event.roomCode;
      void api.finalResults(roomCode).then((results) => {
        if (role === "teacher") {
          setTeacherFinalRows(results.leaderboard);
        } else {
          setStudentFinalRows(results.leaderboard);
        }
      });
    }
  };

  return (
    <main className="app">
      <header className="card row between">
        <h1>Math Race</h1>
        <div className="row">
          <button className={role === "teacher" ? "" : "ghost"} onClick={() => setRole("teacher")}>
            מורה
          </button>
          <button className={role === "student" ? "" : "ghost"} onClick={() => setRole("student")}>
            תלמיד
          </button>
        </div>
      </header>

      <DocNote
        title="System Documentation"
        text="Math Race is a real-time classroom game. Teachers create rooms and approve registrations, students browse open races and register, and live updates are streamed with Server-Sent Events (SSE)."
      />

      {role === "teacher" ? (
        <>
          {!teacherId ? <TeacherLogin onLogin={handleTeacherLogin} onGoogleLogin={handleTeacherGoogleLogin} /> : null}

          {teacherId && !isCreatingRace && !activeRoomCode && !teacherFinalRows ? (
            <TeacherDashboard
              rooms={rooms}
              onCreateRace={() => setIsCreatingRace(true)}
              onOpenRoom={(roomCode) => void loadRoomDetails(roomCode)}
            />
          ) : null}

          {teacherId && isCreatingRace ? (
            <CreateRace onSubmit={handleCreateRace} onCancel={() => setIsCreatingRace(false)} />
          ) : null}

          {teacherId && activeRoomCode && !leaderboard.length && !teacherFinalRows ? (
            <RaceLobby
              roomCode={activeRoomCode}
              participants={participants}
              onApproveParticipant={approveParticipant}
              onRejectParticipant={rejectParticipant}
              onStartRace={startRace}
            />
          ) : null}

          {teacherId && activeRoomCode && leaderboard.length > 0 && !teacherFinalRows ? (
            <LiveRaceDashboard
              roomCode={activeRoomCode}
              participants={participants.filter((p) => p.participantStatus === "ACTIVE")}
              leaderboard={leaderboard}
              eventMessage={teacherEventMessage}
              onEndRace={endRace}
            />
          ) : null}

          {teacherFinalRows ? <FinalResults rows={teacherFinalRows} onReset={resetTeacherFlow} /> : null}
        </>
      ) : (
        <>
          {!studentRoomCode ? <StudentJoin openRaces={openRaces} onJoin={handleStudentJoin} onRefresh={refreshOpenRaces} /> : null}
          {studentRoomCode && studentParticipantStatus === "PENDING" && !studentFinalRows ? (
            <section className="card centered">
              <h3>ממתין לאישור מורה</h3>
              <p>קוד חדר: {studentRoomCode}</p>
              <p>{studentEventMessage || "נרשמת בהצלחה. המתן לאישור."}</p>
            </section>
          ) : null}
          {studentRoomCode && studentParticipantStatus === "ACTIVE" && !studentFinalRows ? (
            <StudentRaceScreen
              roomCode={studentRoomCode}
              progress={studentProgress}
              score={studentScore}
              question={studentQuestion}
              eventMessage={studentEventMessage}
              pendingPathDecision={pendingPathDecision}
              onAnswer={answerQuestion}
              onChoosePath={choosePath}
            />
          ) : null}
          {studentFinalRows ? <FinalResults rows={studentFinalRows} onReset={resetStudentFlow} /> : null}
        </>
      )}
    </main>
  );
}

export default App;
