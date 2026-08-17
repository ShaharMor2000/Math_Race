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
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    eyeOff: (
      <>
        <path d="M3 3l18 18" />
        <path d="M10.7 5.2A11 11 0 0 1 12 5c6 0 9.5 7 9.5 7a18 18 0 0 1-2.1 2.9" />
        <path d="M6.6 6.6C3.9 8.4 2.5 12 2.5 12s3.5 7 9.5 7c1.7 0 3.1-.4 4.3-1" />
        <path d="M9.9 9.9A3 3 0 0 0 14.1 14.1" />
      </>
    )
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[type]}
    </svg>
  );
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validatePassword(password) {
  if (password.length < 8) return "הסיסמה חייבת להכיל לפחות 8 תווים";
  if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/.test(password)) {
    return "הסיסמה חייבת להכיל אות באנגלית, מספר ותו מיוחד";
  }
  return null;
}

function validateRegisterForm(fullName, email, password) {
  if (!fullName.trim()) return "שם מלא הוא שדה חובה";
  if (!validateEmail(email)) return "אימייל לא תקין";
  return validatePassword(password);
}

function mapAuthErrorToHebrew(error) {
  const message = String(error?.message || "").trim();
  const code = String(error?.code || "").trim();
  const lowerMessage = message.toLowerCase();
  const responseText = JSON.stringify(error?.responseBody || "").toLowerCase();

  if (
    error?.status === 404 &&
    !code &&
    (responseText.includes("forgot-password") || responseText.includes("reset-password") || responseText.includes("not found"))
  ) {
    return "שירות איפוס הסיסמה עדיין לא הוגדר במערכת";
  }

  if (code === "USER_NOT_FOUND") {
    return "לא נמצא משתמש עם כתובת המייל הזו";
  }

  if (code === "EMAIL_NOT_VERIFIED") {
    return "יש לאמת את כתובת המייל תחילה";
  }

  if (code === "EMAIL_SEND_FAILED") {
    return "שליחת המייל נכשלה";
  }

  if (code === "EMAIL_NOT_CONFIGURED") {
    return "חסרות הגדרות Gmail SMTP במערכת";
  }

  if (
    code === "INVALID_CREDENTIALS" ||
    lowerMessage.includes("invalid email or password") ||
    lowerMessage.includes("invalid username or password")
  ) {
    return "האימייל או הסיסמה שגויים";
  }

  if (
    code === "EMAIL_EXISTS" ||
    code === "USERNAME_EXISTS" ||
    lowerMessage.includes("email already exists") ||
    lowerMessage.includes("username already exists") ||
    lowerMessage.includes("already exists") ||
    message.includes("כבר קיים")
  ) {
    return "המייל כבר קיים במערכת, נסי להתחבר";
  }

  if (code === "USER_NOT_FOUND" || message.includes("לא נמצא")) {
    return "המשתמש לא נמצא";
  }

  if (code === "INVALID_PASSWORD" || message.includes("סיסמה שגויה")) {
    return "הסיסמה שגויה";
  }

  if (code === "VALIDATION_ERROR" || lowerMessage.includes("validation failed")) {
    return "הפרטים שהוזנו אינם תקינים";
  }

  if (message && !/[A-Za-z]/.test(message)) {
    return message;
  }

  return "אירעה שגיאה. נסי שוב.";
}

function PasswordVisibilityButton({ visible, setVisible }) {
  return (
    <button
      type="button"
      className="auth-password-toggle"
      onMouseDown={(event) => {
        event.preventDefault();
        setVisible(true);
      }}
      onMouseUp={() => setVisible(false)}
      onMouseLeave={() => setVisible(false)}
      onTouchStart={() => setVisible(true)}
      onTouchEnd={() => setVisible(false)}
      onTouchCancel={() => setVisible(false)}
      onKeyDown={(event) => {
        if (event.key === " " || event.key === "Enter") {
          setVisible(true);
        }
      }}
      onKeyUp={() => setVisible(false)}
      onBlur={() => setVisible(false)}
      aria-label="הצגת סיסמה בזמן לחיצה"
    >
      <MiniIcon type={visible ? "eye" : "eyeOff"} />
    </button>
  );
}

export function TeacherAuthModal({
  open,
  onClose,
  onTeacherLogin,
  onTeacherRegister,
  onGoogleLogin,
  onResetPasswordDirect
}) {
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loginHint, setLoginHint] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!open) return null;

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (mode === "register") {
      const validationError = validateRegisterForm(fullName, email, password);
      if (validationError) {
        setError(validationError);
        setSuccess(null);
        return;
      }
    }

    setLoading(true);
    clearMessages();
    try {
      if (mode === "register") {
        await onTeacherRegister(fullName, email, password);
        setSuccess("החשבון נוצר בהצלחה 🎉");
        window.setTimeout(() => {
          setMode("login");
          setPassword("");
          setShowPassword(false);
          setLoginHint(true);
          setSuccess(null);
        }, 1500);
        return;
      }

      await onTeacherLogin(email, password);
      onClose();
    } catch (err) {
      setError(mapAuthErrorToHebrew(err));
    } finally {
      setLoading(false);
    }
  };

  const submitDirectPasswordReset = async (event) => {
    event.preventDefault();
    const emailToCheck = resetEmail.trim();
    if (!validateEmail(emailToCheck)) {
      setError("אימייל לא תקין");
      setSuccess(null);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("הסיסמה ואימות הסיסמה אינם זהים");
      setSuccess(null);
      return;
    }
    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      setSuccess(null);
      return;
    }

    setLoading(true);
    clearMessages();
    try {
      await onResetPasswordDirect(emailToCheck, newPassword);
      setSuccess("הסיסמה עודכנה בהצלחה");
      window.setTimeout(() => {
        setMode("login");
        setEmail(emailToCheck);
        setPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setLoginHint(true);
        setSuccess(null);
      }, 1500);
    } catch (err) {
      setError(mapAuthErrorToHebrew(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    setLoading(true);
    clearMessages();
    try {
      await onGoogleLogin(credential);
      onClose();
    } catch (err) {
      setError(mapAuthErrorToHebrew(err));
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    setMode("login");
    clearMessages();
  };

  return (
    <div className="confirm-overlay teacher-auth-overlay" role="dialog" aria-modal="true" aria-labelledby="teacher-auth-title">
      <div className="confirm-dialog surface-card teacher-auth-dialog">
        <div className="teacher-auth-head">
          <div>
            <p className="page-kicker">מורה</p>
            <h3 id="teacher-auth-title">{mode === "forgot" ? "איפוס סיסמה" : "התחברות / הרשמה"}</h3>
          </div>
          <button type="button" className="toast-close" onClick={onClose} aria-label="סגירה">
            ×
          </button>
        </div>

        {mode !== "forgot" ? (
          <div className="auth-tabs inner-tabs">
            <button
              type="button"
              className={mode === "login" ? "auth-tab active" : "auth-tab"}
              onClick={() => {
                setMode("login");
                clearMessages();
              }}
            >
              התחברות
            </button>
            <button
              type="button"
              className={mode === "register" ? "auth-tab active" : "auth-tab"}
              onClick={() => {
                setMode("register");
                setLoginHint(false);
                clearMessages();
              }}
            >
              הרשמה
            </button>
          </div>
        ) : null}

        {mode === "forgot" ? (
          <form onSubmit={submitDirectPasswordReset} className="auth-form teacher-auth-form">
            <label>
              <span>אימייל</span>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true"><MiniIcon type="user" /></span>
                <input
                  value={resetEmail}
                  onChange={(event) => {
                    setResetEmail(event.target.value);
                    clearMessages();
                  }}
                  placeholder="teacher@school.com"
                  type="email"
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            <label>
              <span>סיסמה חדשה</span>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true"><MiniIcon type="lock" /></span>
                <input
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="הזיני סיסמה חדשה"
                  type={showNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                />
                <PasswordVisibilityButton visible={showNewPassword} setVisible={setShowNewPassword} />
              </div>
            </label>

            <label>
              <span>אימות סיסמה</span>
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true"><MiniIcon type="lock" /></span>
                <input
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="הזיני שוב את הסיסמה"
                  type={showNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                />
              </div>
            </label>

            <Button type="submit" disabled={loading} className="auth-submit">
              {loading ? "ממתין..." : "עדכון סיסמה"}
            </Button>
            <button type="button" className="auth-link-button" onClick={goToLogin}>
              חזרה להתחברות
            </button>
          </form>
        ) : (
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
              <div className="auth-input-wrap">
                <span className="auth-input-icon" aria-hidden="true"><MiniIcon type="lock" /></span>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="הזינו סיסמה"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  required
                />
                <PasswordVisibilityButton visible={showPassword} setVisible={setShowPassword} />
              </div>
            </label>

            <Button type="submit" disabled={loading} className="auth-submit">
              {loading ? "ממתין..." : mode === "register" ? "יצירת חשבון" : "התחברות"}
            </Button>

            {mode === "login" ? (
              <button
                type="button"
                className="auth-link-button"
                onClick={() => {
                  setMode("forgot");
                  setResetEmail(email);
                  setNewPassword("");
                  setConfirmPassword("");
                  clearMessages();
                }}
              >
                שכחתי סיסמה?
              </button>
            ) : null}
          </form>
        )}

        {success ? <p className="auth-success">{success}</p> : null}
        {loginHint && mode === "login" ? (
          <p className="auth-helper">עכשיו אפשר להתחבר עם הסיסמה שהגדרת.</p>
        ) : null}

        {mode !== "forgot" && googleClientId ? (
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
        ) : mode !== "forgot" ? (
          <GoogleSetupHint />
        ) : null}

        {error ? <p className="auth-error">{error}</p> : null}
      </div>
    </div>
  );
}
