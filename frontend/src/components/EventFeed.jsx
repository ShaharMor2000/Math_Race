export function EventFeed({ events }) {
  if (!events?.length) {
    return <div className="event-feed empty">אין התראות עדיין</div>;
  }

  return (
    <div className="event-feed" aria-live="polite">
      {events.map((event) => (
        <div key={event.id} className={`event-feed-item type-${event.type?.toLowerCase() || "info"}`}>
          <span className="event-feed-time">{event.time}</span>
          <span className="event-feed-text">{event.message}</span>
        </div>
      ))}
    </div>
  );
}
