import { useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader } from "./ui/Primitives";

const participantStatusLabels = {
  PENDING: "ממתין לאישור מורה",
  ACTIVE: "מאושר",
  DISCONNECTED: "מנותק",
  LEFT: "עזב",
  FINISHED: "סיים"
};

export function StudentDashboard({
  displayName,
  openRaces = [],
  loading,
  errorMessage,
  activeRoomCode,
  activeParticipantStatus,
  onRefresh,
  onJoinGeneral,
  onJoinSpecific,
  onEnterRace,
  onLeaveRace
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const trimmedQuery = searchQuery.trim();
  const normalizedQuery = trimmedQuery.toUpperCase().replace(/\s/g, "");
  const hasSearch = Boolean(trimmedQuery);

  const filteredRaces = useMemo(() => {
    if (!hasSearch) return openRaces;
    const lowerQuery = trimmedQuery.toLowerCase();
    return openRaces.filter(
      (race) =>
        race.title.toLowerCase().includes(lowerQuery) ||
        race.roomCode.includes(normalizedQuery)
    );
  }, [openRaces, trimmedQuery, normalizedQuery, hasSearch]);

  const exactCodeMatch = useMemo(
    () => openRaces.find((race) => race.roomCode === normalizedQuery),
    [openRaces, normalizedQuery]
  );

  const showEmptyState = openRaces.length === 0 && !activeRoomCode && !loading && !hasSearch;

  const openSearchJoin = () => {
    if (filteredRaces.length === 1) {
      const race = filteredRaces[0];
      onJoinSpecific?.(race.roomCode, race.title);
      return;
    }
    if (exactCodeMatch) {
      onJoinSpecific?.(exactCodeMatch.roomCode, exactCodeMatch.title);
      return;
    }
    if (normalizedQuery.length >= 4) {
      onJoinSpecific?.(normalizedQuery, trimmedQuery || "מרוץ");
    }
  };

  const canContinue =
    filteredRaces.length === 1 || Boolean(exactCodeMatch) || normalizedQuery.length >= 4;

  return (
    <section className="student-dashboard student-home" dir="rtl">
      <PageHeader
        kicker="ברוכים הבאים"
        title="מרוץ חשבון"
        subtitle="בחרו מרוץ והצטרפו עם שם למשחק — בלי הרשמה"
        actions={
          showEmptyState ? null : (
            <Button onClick={onJoinGeneral}>
              הצטרפות כללית
            </Button>
          )
        }
      />

      {errorMessage ? <p className="dashboard-error">{errorMessage}</p> : null}

      <Card className="student-code-search">
        <Field label="חיפוש מרוץ">
          <div className="student-code-search-row">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="שם מרוץ או קוד חדר"
              aria-label="שם מרוץ או קוד חדר"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (canContinue) openSearchJoin();
                }
              }}
            />
            <Button size="sm" disabled={!canContinue} onClick={openSearchJoin}>
              המשך
            </Button>
          </div>
        </Field>
        {hasSearch && filteredRaces.length === 0 ? (
          <p className="muted student-code-search-hint">
            {normalizedQuery.length >= 4
              ? "לא נמצא ברשימה — אפשר להמשיך עם הקוד שהזנתם."
              : "לא נמצאו מרוצים. נסו שם אחר, קוד מלא (4+ תווים), או הצטרפות כללית."}
          </p>
        ) : null}
      </Card>

      <div className="system-capabilities" aria-label="System capabilities">
        {[
          "מחולל שאלות דינמי",
          "רמות קושי משתנות",
          "מעקב התקדמות",
          "דשבורד למורה"
        ].map((capability) => (
          <div className="capability-pill" key={capability}>
            <span aria-hidden="true">✓</span>
            <strong>{capability}</strong>
          </div>
        ))}
      </div>

      {activeRoomCode ? (
        <Card className="student-current-race">
          <div>
            <Badge variant={activeParticipantStatus === "ACTIVE" ? "success" : "warning"}>
              {participantStatusLabels[activeParticipantStatus] || activeParticipantStatus}
            </Badge>
            <h3>{displayName ? `שחק/י: ${displayName}` : "המרוץ שלך"}</h3>
            <p className="muted">קוד חדר: {activeRoomCode}</p>
          </div>
          <div className="student-current-race-actions">
            <Button onClick={onEnterRace} disabled={activeParticipantStatus !== "ACTIVE"}>
              {activeParticipantStatus === "ACTIVE" ? "כניסה למרוץ" : "ממתין לאישור מורה"}
            </Button>
            {onLeaveRace ? (
              <Button variant="ghost" onClick={onLeaveRace}>
                ביטול הרשמה
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}

      <div className="student-open-races">
        <div className="join-section-head">
          <strong>{hasSearch ? "תוצאות חיפוש" : "מרוצים פתוחים"}</strong>
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading}>
            {loading ? "מרענן..." : "רענון"}
          </Button>
        </div>

        {filteredRaces.length === 0 && !loading && hasSearch ? (
          <p className="muted">
            אין מרוצים פתוחים שתואמים לחיפוש.
          </p>
        ) : null}

        <div className="open-race-list">
          {filteredRaces.map((race) => {
            const isFull = Number(race.registeredCount) >= Number(race.maxParticipants);
            return (
              <Card key={race.roomCode} className="open-race-row premium-open-race">
                <div>
                  <h3>{race.title}</h3>
                  <p className="muted">
                    קוד: {race.roomCode} · רשומים: {race.registeredCount}/{race.maxParticipants}
                    {isFull ? " · מלא" : ""}
                  </p>
                </div>
                {isFull ? (
                  <Badge variant="warning">מלא</Badge>
                ) : (
                  <Button size="sm" onClick={() => onJoinSpecific?.(race.roomCode, race.title)}>
                    הצטרפות
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {showEmptyState ? (
        <EmptyState
          title="אין מרוצים פתוחים"
          description="ניתן להצטרף באמצעות קוד חדר או ליצור מרוץ חדש."
          action={<Button onClick={onJoinGeneral}>הצטרפות כללית</Button>}
        />
      ) : null}

    </section>
  );
}
