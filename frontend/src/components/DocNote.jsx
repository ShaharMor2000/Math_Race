export function DocNote({ title, text }) {
  return (
    <div className="doc-note">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}
