export function Toast({ message, type = "info", onClose }) {
  if (!message) return null;

  return (
    <div className={`app-toast toast-${type}`} role="status" aria-live="polite">
      <span>{message}</span>
      {onClose ? (
        <button type="button" className="toast-close" onClick={onClose} aria-label="סגור">
          ×
        </button>
      ) : null}
    </div>
  );
}
