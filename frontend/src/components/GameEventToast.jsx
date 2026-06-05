export function GameEventToast({ message }) {
  if (!message) return null;
  return <div className="event-toast">{message}</div>;
}
