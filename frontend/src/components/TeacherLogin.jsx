import { useEffect, useRef, useState } from "react";
import { DocNote } from "./DocNote";

export function TeacherLogin({ onLogin, onGoogleLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        title="Teacher Login Page"
        text="Use this page to authenticate a teacher and open the teacher control area. Only authenticated teachers can create and manage race rooms."
      />
      <form onSubmit={submit} className="stack">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="אימייל"
          type="email"
          required
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="סיסמה"
          type="password"
          required
        />
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
