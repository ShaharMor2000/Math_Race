import { useEffect, useRef, useState } from "react";

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

function GoogleIcon() {
  return (
    <svg className="google-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.74-.07-1.45-.19-2.13H12v4.03h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.43Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.62-2.42l-3.23-2.51c-.9.6-2.04.95-3.39.95-2.6 0-4.8-1.75-5.59-4.11H3.08v2.59A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.41 13.91A6 6 0 0 1 6.1 12c0-.66.11-1.31.31-1.91V7.5H3.08A10 10 0 0 0 2 12c0 1.61.39 3.13 1.08 4.5l3.33-2.59Z" />
      <path fill="#EA4335" d="M12 5.98c1.47 0 2.79.5 3.82 1.49l2.87-2.87C16.95 2.98 14.7 2 12 2A10 10 0 0 0 3.08 7.5l3.33 2.59C7.2 7.73 9.4 5.98 12 5.98Z" />
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
  initialRoomCode = "",
  openRaces = [],
  onRoleChange,
  onTeacherLogin,
  onTeacherRegister,
  onGoogleLogin,
  onStudentJoin,
  onRefreshOpenRaces
}) {
  const [teacherMode, setTeacherMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [roomCode, setRoomCode] = useState(initialRoomCode.toUpperCase());
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [error, setError] = useState(null);
  const googleInitializedRef = useRef(false);
  const activeRoleRef = useRef(activeRole);

  useEffect(() => {
    activeRoleRef.current = activeRole;
  }, [activeRole]);

  useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(initialRoomCode.toUpperCase());
      onRoleChange("student");
    }
  }, [initialRoomCode, onRoleChange]);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !onGoogleLogin) return;

    const existingScript = document.getElementById("google-gsi-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "google-gsi-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => initializeGoogle(clientId);
      document.body.appendChild(script);
    } else if (!window.google?.accounts?.id) {
      existingScript.addEventListener("load", () => initializeGoogle(clientId), { once: true });
    } else {
      initializeGoogle(clientId);
    }

    function initializeGoogle(googleClientId) {
      if (!window.google?.accounts?.id || googleInitializedRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (!response?.credential) return;
          if (activeRoleRef.current === "student") {
            const googleName = getGoogleDisplayName(response.credential);
            if (googleName) setDisplayName((current) => current || googleName);
            setError("Google account connected. Enter a room code and click Join Race.");
            return;
          }

          setLoading(true);
          setError(null);
          try {
            await onGoogleLogin(response.credential);
          } catch {
            setError("Google sign-in failed.");
          } finally {
            setLoading(false);
          }
        }
      });
      googleInitializedRef.current = true;
      setGoogleReady(true);
    }
  }, [onGoogleLogin]);

  const getGoogleDisplayName = (credential) => {
    try {
      const payload = credential.split(".")[1];
      const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = JSON.parse(window.atob(normalized));
      return decoded.name || decoded.given_name || "";
    } catch {
      return "";
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
    } catch {
      setError(teacherMode === "register" ? "Registration failed." : "Sign in failed. Check your username and password.");
    } finally {
      setLoading(false);
    }
  };

  const joinOpenRace = async (selectedRoomCode) => {
    if (!displayName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onStudentJoin(selectedRoomCode, displayName.trim());
    } catch {
      setError("Could not join this room. Check the room code and try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitStudent = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onStudentJoin(roomCode.toUpperCase(), displayName.trim());
    } catch {
      setError("Could not join this room. Check the room code and try again.");
    } finally {
      setLoading(false);
    }
  };

  const continueWithGoogle = () => {
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID || !onGoogleLogin) {
      setError("Google login is not configured.");
      return;
    }

    if (!googleReady || !window.google?.accounts?.id) {
      setError("Google login is still loading. Try again in a moment.");
      return;
    }

    setError(null);
    window.google.accounts.id.prompt();
  };

  return (
    <section className="auth-page">
      <FloatingNumbersBackground />
      <div className="auth-symbol auth-symbol-one" aria-hidden="true">+</div>
      <div className="auth-symbol auth-symbol-two" aria-hidden="true">*</div>
      <div className="auth-symbol auth-symbol-three" aria-hidden="true">=</div>

      <div className="auth-card">
        <div className="auth-info-wrap">
          <button className="auth-info-button" type="button" aria-label="About Math Race">
            i
          </button>
          <div className="auth-tooltip" role="tooltip">
            Math Race is a real-time classroom math racing game. Teachers create race rooms, students join with a room code,
            solve questions, and progress on a live race track.
          </div>
        </div>

        <div className="auth-card-header">
          <h1>Math Race</h1>
          <h2>Real-Time Mathematics Competition Platform</h2>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Choose role">
          <button
            type="button"
            className={activeRole === "student" ? "auth-tab active" : "auth-tab"}
            onClick={() => {
              setError(null);
              onRoleChange("student");
            }}
          >
            Student
          </button>
          <button
            type="button"
            className={activeRole === "teacher" ? "auth-tab active" : "auth-tab"}
            onClick={() => {
              setError(null);
              onRoleChange("teacher");
            }}
          >
            Teacher
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
                Login
              </button>
              <button
                type="button"
                className={teacherMode === "register" ? "auth-tab active" : "auth-tab"}
                onClick={() => setTeacherMode("register")}
              >
                Register
              </button>
            </div>
            {teacherMode === "register" ? (
              <label>
                <span>Full Name</span>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon" aria-hidden="true"><MiniIcon type="user" /></span>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Enter full name"
                    required
                  />
                </div>
              </label>
            ) : null}
            <label>
              <span>Username</span>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true"><MiniIcon type="user" /></span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter username"
                  type="text"
                  autoComplete="username"
                  required
                />
              </div>
            </label>
            <label>
              <span>Password</span>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true"><MiniIcon type="lock" /></span>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
            </label>
            <button className="auth-submit" disabled={loading}>
              {loading ? "Please wait..." : teacherMode === "register" ? "Create Account" : "Login"}
            </button>
            <div className="auth-separator">
              <span>OR</span>
            </div>
            <button className="auth-google-button" type="button" onClick={continueWithGoogle}>
              <GoogleIcon />
              Continue with Google
            </button>
          </form>
        ) : (
          <form onSubmit={submitStudent} className="auth-form">
            <div className="open-races-login">
              <div className="row between">
                <strong>Open Races</strong>
                <button type="button" className="ghost" onClick={onRefreshOpenRaces}>
                  Refresh
                </button>
              </div>
              {openRaces.length === 0 ? <p className="muted">No open races right now.</p> : null}
              {openRaces.map((race) => (
                <div key={race.roomCode} className="open-race-row compact">
                  <div>
                    <strong>{race.title}</strong>
                    <p className="muted">
                      {race.roomCode} | {race.registeredCount}/{race.maxParticipants}
                    </p>
                  </div>
                  <button type="button" disabled={loading || !displayName.trim()} onClick={() => void joinOpenRace(race.roomCode)}>
                    Join
                  </button>
                </div>
              ))}
            </div>
            <label>
              <span>Student Name</span>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true"><MiniIcon type="user" /></span>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Enter student name"
                  autoComplete="name"
                  required
                />
              </div>
            </label>
            <label>
              <span>Room Code</span>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true"><MiniIcon type="room" /></span>
                <input
                  value={roomCode}
                  onChange={(event) => setRoomCode(event.target.value)}
                  placeholder="Enter room code"
                  autoCapitalize="characters"
                  required
                />
              </div>
            </label>
            <button className="auth-submit" disabled={loading || !displayName.trim()}>
              {loading ? "Joining..." : "Join Race"}
            </button>
            <div className="auth-separator">
              <span>OR</span>
            </div>
            <button className="auth-google-button" type="button" onClick={continueWithGoogle}>
              <GoogleIcon />
              Continue with Google
            </button>
          </form>
        )}

        {error ? <p className="auth-error">{error}</p> : null}
      </div>
    </section>
  );
}
