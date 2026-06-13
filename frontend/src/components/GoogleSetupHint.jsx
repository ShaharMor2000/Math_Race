export function GoogleSetupHint() {
  const openConsole = () => {
    window.open("https://console.cloud.google.com/apis/credentials", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="google-setup-hint surface-card">
      <h3>התחברות עם Google</h3>
      <p>כדי להפעיל כניסה עם Google למורים, צריך Client ID מ-Google Cloud (פעם אחת).</p>
      <ol className="google-setup-steps">
        <li>צרו OAuth Client ID מסוג <strong>Web application</strong></li>
        <li>הוסיפו ל-Authorized origins: <code>http://localhost:5173</code></li>
        <li>הריצו בשורש הפרויקט: <code>.\setup-google.ps1</code></li>
        <li>הדביקו את ה-Client ID והפעילו מחדש backend + frontend</li>
      </ol>
      <button type="button" className="btn btn-secondary" onClick={openConsole}>
        פתיחת Google Cloud Console
      </button>
    </div>
  );
}
