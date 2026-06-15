import { Button, Card, Field, Input } from "./ui/Primitives";

export function StudentJoin({
  mode = "general",
  presetRoomCode = "",
  presetRaceTitle = "",
  onJoin,
  onBack
}) {
  const isSpecific = mode === "specific";
  const roomCode = presetRoomCode.toUpperCase();

  const submitSpecific = async (event) => {
    event.preventDefault();
    const name = event.currentTarget.displayName.value.trim();
    if (!name || !roomCode) return;
    await onJoin(roomCode, name);
  };

  const submitGeneral = async (event) => {
    event.preventDefault();
    const name = event.currentTarget.displayName.value.trim();
    const code = event.currentTarget.roomCode.value.trim().toUpperCase();
    if (!name || !code) return;
    await onJoin(code, name);
  };

  if (isSpecific) {
    return (
      <Card className="centered student-join-card">
        <p className="page-kicker">הצטרפות למרוץ</p>
        <h2>{presetRaceTitle || "מרוץ פתוח"}</h2>
        <p className="page-subtitle">
          קוד חדר: <strong className="room-code-inline">{roomCode}</strong>
          <br />
          הזינו שם למשחק — ההרשמה ממתינה לאישור המורה.
        </p>

        <form onSubmit={submitSpecific} className="stack join-form-stack">
          <Field label="שם במשחק">
            <Input name="displayName" placeholder="לדוגמה: יואב כהן" autoComplete="nickname" autoFocus required />
          </Field>
          <div className="join-form-actions">
            <Button type="submit">הצטרפות</Button>
            {onBack ? (
              <Button type="button" variant="ghost" onClick={onBack}>
                חזרה לדשבורד
              </Button>
            ) : null}
          </div>
        </form>
      </Card>
    );
  }

  return (
    <Card className="centered student-join-card">
      <p className="page-kicker">הצטרפות כללית</p>
      <h2>הצטרפות למרוץ</h2>
      <p className="page-subtitle">הזינו שם למשחק וקוד חדר שקיבלתם מהמורה.</p>

      <form onSubmit={submitGeneral} className="stack join-form-stack">
        <Field label="שם במשחק">
          <Input name="displayName" placeholder="לדוגמה: יואב כהן" autoComplete="nickname" autoFocus required />
        </Field>
        <Field label="קוד חדר">
          <Input
            name="roomCode"
            defaultValue={presetRoomCode.toUpperCase()}
            placeholder="ABCDEF"
            autoCapitalize="characters"
            required
          />
        </Field>
        <div className="join-form-actions">
          <Button type="submit">הצטרף למרוץ</Button>
          {onBack ? (
            <Button type="button" variant="ghost" onClick={onBack}>
              חזרה לדשבורד
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
