import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../services/api";

function validatePassword(password) {
  if (password.length < 8) return "הסיסמה חייבת להכיל לפחות 8 תווים";
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/.test(password)) {
    return "הסיסמה חייבת להכיל אות גדולה, אות קטנה, מספר ותו מיוחד";
  }
  return null;
}

function mapResetError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  if (code === "INVALID_RESET_TOKEN") return "קישור איפוס הסיסמה אינו תקין";
  if (code === "RESET_TOKEN_EXPIRED") return "קישור איפוס הסיסמה פג תוקף";
  if (code === "RESET_TOKEN_USED") return "קישור איפוס הסיסמה כבר נוצל";
  if (code === "VALIDATION_ERROR") return "הפרטים שהוזנו אינם תקינים";
  if (message && !/[A-Za-z]/.test(message)) return message;
  return "אירעה שגיאה. נסי שוב.";
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("קישור איפוס הסיסמה אינו תקין");
      return;
    }

    api.teacherValidateResetToken(token)
      .then((response) => {
        setEmail(response.email || "");
        setStatus("ready");
      })
      .catch((error) => {
        setStatus("error");
        setMessage(mapResetError(error));
      });
  }, [token]);

  const submit = async (event) => {
    event.preventDefault();
    const validationError = validatePassword(password);
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      await api.teacherResetPassword(token, password);
      setStatus("success");
      setPassword("");
      setMessage("הסיסמה עודכנה בהצלחה. אפשר להתחבר כעת.");
    } catch (error) {
      setMessage(mapResetError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page reset-password-page" dir="rtl">
      <section className="auth-card reset-password-card">
        <div className="auth-card-header">
          <p className="auth-card-kicker">מרוץ חשבון</p>
          <h1>איפוס סיסמה</h1>
          {email ? <p>הגדרת סיסמה חדשה עבור {email}</p> : null}
        </div>

        {status === "loading" ? <p className="auth-helper">בודק את קישור האיפוס...</p> : null}

        {status === "ready" ? (
          <form onSubmit={submit} className="auth-form reset-password-form">
            <label>
              <span>סיסמה חדשה</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="הזיני סיסמה חדשה"
                type="password"
                autoComplete="new-password"
                required
              />
            </label>
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "שומר..." : "שמירת סיסמה חדשה"}
            </button>
          </form>
        ) : null}

        {status === "success" ? (
          <a className="auth-submit reset-login-link" href="/">
            מעבר להתחברות
          </a>
        ) : null}

        {message ? (
          <p className={status === "success" ? "auth-success" : "auth-error"}>{message}</p>
        ) : null}
      </section>
    </main>
  );
}
