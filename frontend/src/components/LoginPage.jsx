import { useEffect, useRef, useState } from "react";
import { GoogleSetupHint } from "./GoogleSetupHint";
import { GoogleSignInButton } from "./GoogleSignInButton";

function MiniIcon({ type }) {
  const paths = {
    user: (
      <>
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
      </>
    ),
    lock: (
      <>
        <path d="M7 11V8a5 5 0 0 1 10 0v3" />
        <path d="M6 11h12v9H6z" />
      </>
    ),
    room: (
      <>
        <path d="M4 5h16v14H4z" />
        <path d="M8 9h8" />
        <path d="M8 13h4" />
      </>
    )
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[type]}
    </svg>
  );
}

export function FloatingNumbersBackground() {
  const items = [
    ["7", 72, 120, "slow"],
    ["12", 250, 86, "medium"],
    ["3x", 430, 160, "fast"],
    ["42", 640, 98, "slow"],
    ["9", 860, 176, "medium"],
    ["15", 1060, 120, "fast"],
    ["8", 1220, 230, "slow"],
    ["24", 140, 330, "fast"],
    ["5", 360, 420, "slow"],
    ["x2", 560, 360, "medium"],
    ["18", 780, 450, "fast"],
    ["6", 980, 340, "slow"],
    ["30", 1160, 430, "medium"],
    ["11", 220, 620, "medium"],
    ["4", 500, 650, "fast"],
    ["21", 740, 590, "slow"],
    ["10", 980, 650, "fast"]
  ];

  return (
    <svg className="auth-number-field" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g className="number-layer number-layer-a">
        {items.slice(0, 6).map(([text, x, y, speed]) => (
          <text key={`${text}-${x}-${y}`} className={`floating-number ${speed}`} x={x} y={y}>
            {text}
          </text>
        ))}
      </g>
      <g className="number-layer number-layer-b">
        {items.slice(6, 12).map(([text, x, y, speed]) => (
          <text key={`${text}-${x}-${y}`} className={`floating-number ${speed}`} x={x} y={y}>
            {text}
          </text>
        ))}
      </g>
      <g className="number-layer number-layer-c">
        {items.slice(12).map(([text, x, y, speed]) => (
          <text key={`${text}-${x}-${y}`} className={`floating-number ${speed}`} x={x} y={y}>
            {text}
          </text>
        ))}
      </g>
    </svg>
  );
}

export function LoginPage({
  activeRole,
  theme = "dark",
  initialRoomCode = "",
  openRaces = [],
  onRoleChange,
  onTeacherLogin,
  onTeacherRegister,
  onGoogleLogin,
  onStudentJoin,
  onStudentDashboardLogin,
  onRefreshOpenRaces
}) {
  const [teacherMode, setTeacherMode] = useState("login");
  const [studentMode, setStudentMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [roomCode, setRoomCode] = useState(initialRoomCode.toUpperCase());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const activeRoleRef = useRef(activeRole);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    activeRoleRef.current = activeRole;
  }, [activeRole]);

  useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(initialRoomCode.toUpperCase());
      onRoleChange("student");
    }
  }, [initialRoomCode, onRoleChange]);

  const decodeGoogleCredential = (credential) => {
    try {
      const payload = credential.split(".")[1];
      const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(window.atob(normalized));
    } catch {
      return {};
    }
  };

  const handleGoogleCredential = async (credential) => {
    const profile = decodeGoogleCredential(credential);

    if (activeRoleRef.current === "student") {
      if (profile.email) setEmail((current) => current || profile.email);
      const googleName = profile.name || profile.given_name || "";
      if (googleName) setDisplayName((current) => current || googleName);
      setError(null);
      return;
    }

    if (!onGoogleLogin) {
      setError("התחברות Google זמינה למורים בלבד.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onGoogleLogin(credential);
    } catch (err) {
      setError(err.message || "התחברות Google נכשלה.");
    } finally {
      setLoading(false);
    }
  };

  const submitTeacher = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (teacherMode === "register") {
        await onTeacherRegister(fullName, email, password);
      } else {
        await onTeacherLogin(email, password);
      }
    } catch (err) {
      setError(err.message || (teacherMode === "register" ? "ההרשמה נכשלה." : "ההתחברות נכשלה. בדקו שם משתמש וסיסמה."));
    } finally {
      setLoading(false);
    }
  };

  const joinOpenRace = async (selectedRoomCode) => {
    if (!displayName.trim() || !email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onStudentJoin(selectedRoomCode.trim().toUpperCase(), displayName.trim(), email.trim());
    } catch (err) {
      setError(err.message || "לא ניתן להצטרף לחדר. בדקו את הקוד ונסו שוב.");
    } finally {
      setLoading(false);
    }
  };

  const submitStudent = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (studentMode === "login") {
        await onStudentDashboardLogin(email.trim());
      } else {
        await onStudentJoin(roomCode.trim().toUpperCase(), displayName.trim(), email.trim());
      }
    } catch (err) {
      setError(err.message || (studentMode === "login" ? "לא ניתן לפתוח את דשבורד התלמיד." : "לא ניתן להצטרף לחדר."));
    } finally {
      setLoading(false);
    }
  };

  const openStudentDashboard = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onStudentDashboardLogin(email.trim());
    } catch (err) {
      setError(err.message || "לא ניתן לפתוח את דשבורד התלמיד.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-page">
      <FloatingNumbersBackground />
      <div className="auth-symbol auth-symbol-one" aria-hidden="true">+</div>
      <div className="auth-symbol auth-symbol-two" aria-hidden="true">*</div>
      <div className="auth-symbol auth-symbol-three" aria-hidden="true">=</div>

      <div className="auth-card">
        <div className="auth-info-wrap">
          <button className="auth-info-button" type="button" aria-label="אודות מרוץ חשבון">
            i
          </button>
          <div className="auth-tooltip" role="tooltip">
            מרוץ חשבון הוא משחק מתמטיקה בזמן אמת לכיתה. מורים יוצרים חדרים, תלמידים מצטרפים עם קוד,
            פותרים שאלות ומתקדמים על מסלול חי.
          </div>
        </div>

        <div className="auth-card-header">
          <p className="auth-card-kicker">פלטפורמת כיתה</p>
          <h1>מרוץ חשבון</h1>
          <h2>תחרות מתמטיקה בזמן אמת</h2>
          <p>מורים יוצרים מרוצים, תלמידים מצטרפים עם קוד חדר ומתקדמים על מסלול חי.</p>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="בחירת תפקיד">
          <button
            type="button"
            className={activeRole === "student" ? "auth-tab active" : "auth-tab"}
            onClick={() => {
              setError(null);
              onRoleChange("student");
            }}
          >
            תלמיד
          </button>
          <button
            type="button"
            className={activeRole === "teacher" ? "auth-tab active" : "auth-tab"}
            onClick={() => {
              setError(null);
              onRoleChange("teacher");
            }}
          >
            מורה
          </button>
        </div>

        {activeRole === "teacher" ? (
          <form onSubmit={submitTeacher} className="auth-form">
            <div className="auth-tabs inner-tabs">
              <button
                type="button"
                className={teacherMode === "login" ? "auth-tab active" : "auth-tab"}
                onClick={() => setTeacherMode("login")}
              >
                התחברות
              </button>
              <button
                type="button"
                className={teacherMode === "register" ? "auth-tab active" : "auth-tab"}
                onClick={() => setTeacherMode("register")}
              >
                הרשמה
              </button>
            </div>
            {teacherMode === "register" ? (
              <label>
                <span>שם מלא</span>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon" aria-hidden="true"><MiniIcon type="user" /></span>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="הזינו שם מלא"
                    required
                  />
                </div>
              </label>
            ) : null}
            <label>
              <span>אימייל / שם משתמש</span>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true"><MiniIcon type="user" /></span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="teacher@school.com"
                  type="text"
                  autoComplete="username"
                  required
                />
              </div>
            </label>
            <label>
              <span>סיסמה</span>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true"><MiniIcon type="lock" /></span>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="הזינו סיסמה"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
            </label>
            <button className="auth-submit" disabled={loading}>
              {loading ? "ממתין..." : teacherMode === "register" ? "יצירת חשבון" : "התחברות"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitStudent} className="auth-form">
            <div className="auth-tabs inner-tabs">
              <button
                type="button"
                className={studentMode === "register" ? "auth-tab active" : "auth-tab"}
                onClick={() => setStudentMode("register")}
              >
                הרשמה
              </button>
              <button
                type="button"
                className={studentMode === "login" ? "auth-tab active" : "auth-tab"}
                onClick={() => setStudentMode("login")}
              >
                התחברות
              </button>
            </div>

            <label>
              <span>מייל תלמיד</span>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true"><MiniIcon type="user" /></span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="student@school.com"
                  type="email"
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            {studentMode === "register" ? (
              <>
                <label>
                  <span>שם תלמיד</span>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon" aria-hidden="true"><MiniIcon type="user" /></span>
                    <input
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="הזינו שם תלמיד"
                      autoComplete="name"
                      required
                    />
                  </div>
                </label>
                <label>
                  <span>קוד חדר</span>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon" aria-hidden="true"><MiniIcon type="room" /></span>
                    <input
                      value={roomCode}
                      onChange={(event) => setRoomCode(event.target.value)}
                      placeholder="ABCDEF"
                      autoCapitalize="characters"
                      required
                    />
                  </div>
                </label>
                <div className="open-races-login">
                  <div className="row between">
                    <strong>מרוצים פתוחים</strong>
                    <button type="button" className="ghost" onClick={onRefreshOpenRaces}>
                      רענון
                    </button>
                  </div>
                  {openRaces.length === 0 ? <p className="muted">אין מרוצים פתוחים כרגע.</p> : null}
                  {openRaces.map((race) => (
                    <div key={race.roomCode} className="open-race-row compact">
                      <div>
                        <strong>{race.title}</strong>
                        <p className="muted">
                          {race.roomCode} · {race.registeredCount}/{race.maxParticipants}
                        </p>
                      </div>
                      <button type="button" className="btn btn-primary btn-sm" disabled={loading || !displayName.trim() || !email.trim()} onClick={() => void joinOpenRace(race.roomCode)}>
                        הצטרף
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            <button
              className="auth-submit"
              disabled={loading || !email.trim() || (studentMode === "register" && (!displayName.trim() || !roomCode.trim()))}
            >
              {loading ? "ממתין..." : studentMode === "login" ? "כניסה לדשבורד" : "הצטרפות למרוץ"}
            </button>
          </form>
        )}

        {googleClientId ? (
          <>
            <div className="auth-separator">
              <span>או</span>
            </div>
            <GoogleSignInButton
              clientId={googleClientId}
              onCredential={handleGoogleCredential}
              label={activeRole === "teacher" ? "התחברות עם Google" : "המשך עם Google"}
              loading={loading}
              disabled={loading}
            />
          </>
        ) : (
          <GoogleSetupHint />
        )}

        {error ? <p className="auth-error">{error}</p> : null}
      </div>
    </section>
  );
}
