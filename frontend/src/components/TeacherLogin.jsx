import { useEffect, useRef, useState } from "react";
import { DocNote } from "./DocNote";

export function TeacherLogin({ onLogin, onGoogleLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const googleButtonRef = useRef(null);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !googleButtonRef.current || !onGoogleLogin) return;

    const existingScript = document.getElementById("google-gsi-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "google-gsi-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => renderGoogleButton(clientId);
      document.body.appendChild(script);
    } else {
      renderGoogleButton(clientId);
    }

    function renderGoogleButton(googleClientId) {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (!response?.credential) return;
          setLoading(true);
          setError(null);
          try {
            await onGoogleLogin(response.credential);
          } catch {
            setError("התחברות עם Google נכשלה.");
          } finally {
            setLoading(false);
          }
        }
      });
      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        width: 280
      });
    }
  }, [onGoogleLogin]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onLogin(email, password);
    } catch {
      setError("התחברות נכשלה. בדוק אימייל וסיסמה.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card centered">
      <h2>כניסת מורה</h2>
      <DocNote
        title="כניסת מורה"
        text="התחברו כמורה כדי לפתוח את אזור הניהול. רק מורים מאומתים יכולים ליצור ולנהל חדרי מרוץ."
      />
      <form onSubmit={submit} className="stack">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="אימייל"
          type="email"
          required
        />
        <div className="auth-input-wrap auth-input-wrap--password">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="סיסמה"
            type={showPassword ? "text" : "password"}
            required
          />
          <button
            type="button"
            className="auth-password-toggle"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "הסתרת סיסמה" : "הצגת סיסמה"}
            aria-pressed={showPassword}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {showPassword ? (
                <>
                  <path d="M3 3l18 18" />
                  <path d="M10.7 10.7A2.5 2.5 0 0 0 12 14.5a2.5 2.5 0 0 0 2.3-1.3" />
                  <path d="M6.4 6.6C4.2 8 2.8 10.1 2 12c0 0 3.5 6 10 6 1.8 0 3.3-.4 4.6-1" />
                  <path d="M9.9 5.2C10.6 5.1 11.3 5 12 5c6.5 0 10 7 10 7a16.7 16.7 0 0 1-3.2 4.1" />
                </>
              ) : (
                <>
                  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="2.5" />
                </>
              )}
            </svg>
          </button>
        </div>
        <button disabled={loading}>{loading ? "טוען..." : "התחבר"}</button>
      </form>
      <div className="google-login-wrap">
        <div className="muted">או התחברות עם Google</div>
        {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
          <div ref={googleButtonRef} />
        ) : (
          <p className="muted">להפעלת Google Login הגדירי VITE_GOOGLE_CLIENT_ID</p>
        )}
      </div>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
