import { useEffect, useRef, useState } from "react";

export function GoogleIcon() {
  return (
    <svg className="google-signin-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.74-.07-1.45-.19-2.13H12v4.03h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.43Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.62-2.42l-3.23-2.51c-.9.6-2.04.95-3.39.95-2.6 0-4.8-1.75-5.59-4.11H3.08v2.59A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.41 13.91A6 6 0 0 1 6.1 12c0-.66.11-1.31.31-1.91V7.5H3.08A10 10 0 0 0 2 12c0 1.61.39 3.13 1.08 4.5l3.33-2.59Z" />
      <path fill="#EA4335" d="M12 5.98c1.47 0 2.79.5 3.82 1.49l2.87-2.87C16.95 2.98 14.7 2 12 2A10 10 0 0 0 3.08 7.5l3.33 2.59C7.2 7.73 9.4 5.98 12 5.98Z" />
    </svg>
  );
}

function loadGoogleScript() {
  return new Promise((resolve) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existingScript = document.getElementById("google-gsi-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.body.appendChild(script);
  });
}

let googleInitialized = false;

export function GoogleSignInButton({ clientId, onCredential, label, disabled = false, loading = false }) {
  const overlayRef = useRef(null);
  const credentialRef = useRef(onCredential);
  const [ready, setReady] = useState(false);

  credentialRef.current = onCredential;

  useEffect(() => {
    if (!clientId) return;

    let cancelled = false;

    loadGoogleScript().then(() => {
      if (cancelled || !window.google?.accounts?.id) return;

      if (!googleInitialized) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response?.credential) {
              credentialRef.current?.(response.credential);
            }
          }
        });
        googleInitialized = true;
      }

      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  useEffect(() => {
    if (!ready || !overlayRef.current || !window.google?.accounts?.id || disabled || loading) return;

    const host = overlayRef.current;
    host.innerHTML = "";

    window.google.accounts.id.renderButton(host, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      locale: "he",
      width: host.offsetWidth || host.parentElement?.offsetWidth || 420
    });
  }, [ready, disabled, loading, label]);

  const shellClass = [
    "google-signin-shell",
    loading ? "is-loading" : "",
    disabled ? "is-disabled" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClass}>
      <div className="google-signin-visual" aria-hidden="true">
        <span className="google-signin-logo">
          <GoogleIcon />
        </span>
        <span className="google-signin-label">{label}</span>
        {loading ? <span className="google-signin-spinner" aria-hidden="true" /> : null}
      </div>
      {!disabled && !loading ? (
        <div
          ref={overlayRef}
          className="google-signin-overlay"
          role="button"
          tabIndex={0}
          aria-label={label}
        />
      ) : null}
    </div>
  );
}
