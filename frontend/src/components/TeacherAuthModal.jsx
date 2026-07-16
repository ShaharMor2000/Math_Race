import { useState } from "react";
import { GoogleSetupHint } from "./GoogleSetupHint";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { Button } from "./ui/Primitives";

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
    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    eyeOff: (
      <>
        <path d="M3 3l18 18" />
        <path d="M10.7 10.7A2.5 2.5 0 0 0 12 14.5a2.5 2.5 0 0 0 2.3-1.3" />
        <path d="M6.4 6.6C4.2 8 2.8 10.1 2 12c0 0 3.5 6 10 6 1.8 0 3.3-.4 4.6-1" />
        <path d="M9.9 5.2C10.6 5.1 11.3 5 12 5c6.5 0 10 7 10 7a16.7 16.7 0 0 1-3.2 4.1" />
      </>
    )
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[type]}
    </svg>
  );
}

export function TeacherAuthModal({
  open,
  onClose,
  onTeacherLogin,
  onTeacherRegister,
  onGoogleLogin
}) {
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "register") {
        await onTeacherRegister(fullName, email, password);
      } else {
        await onTeacherLogin(email, password);
      }
      onClose();
    } catch (err) {
      setError(err.message || (mode === "register" ? "ההרשמה נכשלה." : "ההתחברות נכשלה."));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    setLoading(true);
    setError(null);
    try {
      await onGoogleLogin(credential);
      onClose();
    } catch (err) {
      setError(err.message || "התחברות Google נכשלה.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="confirm-overlay teacher-auth-overlay" role="dialog" aria-modal="true" aria-labelledby="teacher-auth-title">
      <div className="confirm-dialog surface-card teacher-auth-dialog">
        <div className="teacher-auth-head">
          <div>
            <p className="page-kicker">מורה</p>
            <h3 id="teacher-auth-title">התחברות / הרשמה</h3>
          </div>
          <button type="button" className="toast-close" onClick={onClose} aria-label="סגירה">
            ×
          </button>
        </div>

        <div className="auth-tabs inner-tabs">
          <button
            type="button"
            className={mode === "login" ? "auth-tab active" : "auth-tab"}
            onClick={() => {
              setMode("login");
              setError(null);
            }}
          >
            התחברות
          </button>
          <button
            type="button"
            className={mode === "register" ? "auth-tab active" : "auth-tab"}
            onClick={() => {
              setMode("register");
              setError(null);
            }}
          >
            הרשמה
          </button>
        </div>

        <form onSubmit={submit} className="auth-form teacher-auth-form">
          {mode === "register" ? (
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
            <div className="auth-input-wrap auth-input-wrap--password">
              <span className="auth-input-icon" aria-hidden="true"><MiniIcon type="lock" /></span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="הזינו סיסמה"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "הסתרת סיסמה" : "הצגת סיסמה"}
                aria-pressed={showPassword}
              >
                <MiniIcon type={showPassword ? "eyeOff" : "eye"} />
              </button>
            </div>
          </label>
          <Button type="submit" disabled={loading} className="auth-submit">
            {loading ? "ממתין..." : mode === "register" ? "יצירת חשבון" : "התחברות"}
          </Button>
        </form>

        {googleClientId ? (
          <>
            <div className="auth-separator">
              <span>או</span>
            </div>
            <GoogleSignInButton
              clientId={googleClientId}
              onCredential={handleGoogleCredential}
              label="התחברות עם Google"
              loading={loading}
              disabled={loading}
            />
          </>
        ) : (
          <GoogleSetupHint />
        )}

        {error ? <p className="auth-error">{error}</p> : null}
      </div>
    </div>
  );
}
