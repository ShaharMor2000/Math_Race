export function Button({ variant = "primary", size = "md", className = "", type, ...props }) {
  const sizeClass = size === "md" ? "" : `btn-${size}`;
  return (
    <button
      type={type ?? "button"}
      className={["btn", `btn-${variant}`, sizeClass, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

export function Card({ as: Tag = "section", className = "", children, ...props }) {
  return (
    <Tag className={["surface-card", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </Tag>
  );
}

export function Badge({ variant = "default", className = "", children }) {
  return <span className={["badge", `badge-${variant}`, className].filter(Boolean).join(" ")}>{children}</span>;
}

export function Input({ className = "", ...props }) {
  return <input className={["field-input", className].filter(Boolean).join(" ")} {...props} />;
}

export function Field({ label, children, hint }) {
  return (
    <label className="field-block">
      {label ? <span className="field-label">{label}</span> : null}
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <span className="stat-card-label">{label}</span>
      <strong className="stat-card-value">{value}</strong>
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">🏁</div>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  );
}

export function PageHeader({ kicker, title, subtitle, actions, badge }) {
  return (
    <header className="page-header">
      <div className="page-header-copy">
        {kicker ? <p className="page-kicker">{kicker}</p> : null}
        <div className="page-header-title-row">
          <h2>{title}</h2>
          {badge}
        </div>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}

export function AppChrome({ brand, subtitle, actions, theme, onToggleTheme }) {
  return (
    <header className="app-chrome">
      <div className="app-chrome-brand">
        <div className="app-logo" aria-hidden="true">∑</div>
        <div>
          <h1>{brand}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      <div className="app-chrome-actions">
        {actions}
        <button type="button" className="btn btn-ghost btn-sm theme-chip" onClick={onToggleTheme} aria-label="החלפת מצב תצוגה">
          {theme === "dark" ? "☀️ בהיר" : "🌙 כהה"}
        </button>
      </div>
    </header>
  );
}
