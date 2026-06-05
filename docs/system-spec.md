# System Specification - Math Race

## 1. Product Vision

`Math Race` היא מערכת כיתתית בזמן אמת, שבה תלמידים מתרגלים חשבון דרך מרוץ תחרותי.
המורה פותח חדר, התלמידים מצטרפים עם קוד, ומסך הקרנה מרכזי מציג מרוץ חי של עד 8 רכבים.

מטרות מוצר:

- לשלב תרגול מתמטי עם מוטיבציית משחק
- לייצר חוויית כיתה חיה ודינמית
- לאפשר למורה שליטה בזמן אמת ברמת קושי וקצב
- לשמור על הוגנות באמצעות מנגנוני איזון סמויים

---

## 2. User Roles

- **Teacher**
  - התחברות מאובטחת
  - יצירת וניהול מרוצים
  - הקרנה חיה וניהול כיתה
  - צפייה בתוצאות ודוחות
- **Student**
  - כניסה עם קוד חדר + שם
  - מענה לשאלות בזמן אמת
  - קבלת אירועים, בונוסים ומשוב מיידי

---

## 3. Screen Specification

### 3.1 Teacher Login (`TeacherLogin`)

מטרה: זיהוי מורה וכניסה למערכת.

אלמנטים:

- שדות: אימייל, סיסמה
- כפתור כניסה
- הודעות שגיאה/הצלחה

States:

- loading
- invalid credentials
- locked account (אופציונלי)

### 3.2 Teacher Dashboard (`TeacherDashboard`)

מטרה: ניהול כללי של מרוצים.

אלמנטים:

- כפתור "יצירת מרוץ חדש"
- רשימת חדרים אחרונים
- סטטוס חדרים: Draft, Lobby, Running, Finished
- פעולות מהירות: פתיחה, סיום, שכפול הגדרות

### 3.3 Create Race (`CreateRace`)

מטרה: יצירת חדר מרוץ חדש.

אלמנטים:

- שם מרוץ
- כיתה/קבוצה
- זמן שאלה ברירת מחדל (שניות)
- רמת קושי התחלתית
- מספר משתתפים מקסימלי (עד 8)
- האם להפעיל אירועי מזל
- האם לאפשר מסלולי בחירה (אוטוסטרדה/דרך עפר)

Output:

- יצירת `roomCode` ייחודי בן 6-8 תווים

### 3.4 Race Lobby (`RaceLobby`)

מטרה: ניהול משתתפים לפני תחילת המרוץ.

אלמנטים:

- קוד חדר גדול וברור להקרנה
- רשימת תלמידים שהצטרפו
- סטטוס לכל תלמיד: connected / ready
- כפתור הסרה לתלמיד
- כפתור "התחל מרוץ"

Rules:

- מינימום 1 משתתף
- מקסימום 8 משתתפים

### 3.5 Live Race Dashboard (`LiveRaceDashboard`)

מטרה: הקרנה כיתתית בזמן אמת.

אלמנטים:

- מסלול לינארי 0-1000
- עד 8 רכבים עם צבע/אייקון ייחודי
- לוח מובילים חי
- Toast/Feed של אירועי משחק
- סטטוס מרוץ (Running/Paused/Finished)
- טיימר גלובלי / זמן שעבר

Realtime:

- מיקום רכבים
- עקיפות
- בונוסים/תקלות
- Winner announcement

### 3.6 Student Join (`StudentJoin`)

מטרה: כניסת תלמיד דרך קוד חדר.

אלמנטים:

- roomCode
- שם תלמיד
- כפתור הצטרפות
- בדיקת תקינות קוד ומקום פנוי

### 3.7 Student Race Screen (`StudentRaceScreen`)

מטרה: חוויית משחק אישית לתלמיד.

אלמנטים:

- כרטיס שאלה (`QuestionCard`)
- 4 אפשרויות (או קלט מספרי)
- טיימר מקומי לשאלה
- התקדמות אישית במסלול
- אירועים פעילים (בוסט/האטה/רמז)
- בחירה בין מסלולים בעת אירוע החלטה

### 3.8 Final Results (`FinalResults`)

מטרה: הצגת דירוג וסיכום.

אלמנטים:

- פודיום 1-3
- דירוג מלא
- מדדים: דיוק, זמן ממוצע, ניקוד כולל, אירועים
- כפתור "מרוץ חדש" / "חזרה לדשבורד"

---

## 4. UX / UI Design Guidelines

### Visual Language

- עיצוב נקי ומודרני
- צבעוניות מתונה (לא ילדותית)
- גרדיאנטים רכים למסלול ותנועה
- כרטיסים נקיים עם הצללות עדינות
- אייקונים ברורים למצבי משחק

### Typography

- Font עברי + לטיני קריא
- היררכיית כותרות/גוף/metadata ברורה
- contrast גבוה במסך הקרנה

### Motion

- אנימציות תנועה קצרות (200-350ms)
- easing טבעי לרכבים במסלול
- מיקרו-אנימציות ל-feedback (correct/wrong)

### Responsiveness

- Teacher screens: desktop + projector first
- Student screens: mobile first
- safe zones לכפתורים גדולים במסכים קטנים

### Accessibility

- צבע + צורה (לא להסתמך רק על צבע)
- keyboard focus states
- טקסט ברור עבור טיימר ומצב שאלה

---

## 5. Non-Functional Requirements

- זמן תגובה API: עד 300ms בממוצע
- Latency עדכון SSE: עד 1 שניה
- תמיכה ב-8 תלמידים לחדר (MVP)
- שחזור חיבור SSE אוטומטי בצד לקוח
- לוגים מלאים לאירועי משחק לצורכי אנליטיקה

---

## 6. Proposed Implementation File Structure

### Backend

```text
backend/src/main/java/com/mathrace/
  MathRaceApplication.java
  config/
    AppConfig.java
    CorsConfig.java
  controller/
    AuthController.java
    TeacherRaceController.java
    StudentRaceController.java
    StreamController.java
  service/
    AuthService.java
    RaceRoomService.java
    GameEngineService.java
    QuestionGeneratorService.java
    ScoringEngine.java
    LuckEventEngine.java
    SseEventPublisher.java
  repository/
    TeacherRepository.java
    StudentRepository.java
    RaceRoomRepository.java
    RaceParticipantRepository.java
    QuestionTemplateRepository.java
    GeneratedQuestionRepository.java
    AnswerRepository.java
    GameEventRepository.java
    RaceResultRepository.java
  entity/
    Teacher.java
    Student.java
    RaceRoom.java
    RaceParticipant.java
    QuestionTemplate.java
    GeneratedQuestion.java
    Answer.java
    GameEvent.java
    RaceResult.java
  dto/
    auth/...
    race/...
    stream/...
  model/
    enums/...
    runtime/GameSession.java
```

### Frontend

```text
frontend/src/
  components/
    TeacherLogin.tsx
    TeacherDashboard.tsx
    CreateRace.tsx
    RaceLobby.tsx
    LiveRaceDashboard.tsx
    StudentJoin.tsx
    StudentRaceScreen.tsx
    QuestionCard.tsx
    RaceTrack.tsx
    Leaderboard.tsx
    GameEventToast.tsx
    FinalResults.tsx
  services/
    api.ts
    sse.ts
  hooks/
    useRaceStream.ts
  state/
    raceStore.ts
  styles/
    theme.ts
  types/
    api.ts
```

---

## 7. Delivery Plan

1. הקמת backend + frontend skeleton
2. מימוש authentication למורה + join לתלמיד
3. מימוש lifecycle מלא לחדר מרוץ
4. מימוש מנוע שאלות/ניקוד/אירועים
5. מימוש SSE live updates
6. מימוש UI הקרנה + UI תלמיד
7. בדיקות אינטגרציה וייצוב
