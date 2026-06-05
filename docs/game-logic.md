# Game Logic - Math Race

## 1. Core Rules

- עד 8 משתתפים במרוץ
- מסלול לינארי מ-`0` עד `1000` נקודות התקדמות
- כל תשובה נכונה מקדמת במסלול ומגדילה ניקוד כולל
- תשובה שגויה לא מקדמת ועלולה להחזיר מעט אחורה
- מנצח הוא הראשון שמגיע ל-`1000`

---

## 2. Question Generation

מקור השאלות:

- תבניות דינמיות (`question_templates`) ולא בנק קבוע
- פרמטריזציה אקראית לכל תבנית
- התאמת קושי לפי ביצועים ואירועים פעילים

Difficulty bands:

- **EASY**: פעולות בסיסיות עם מספרים קטנים
- **MEDIUM**: כפל/חילוק פשוט + ביטויים דו-שלביים
- **HARD**: ביטויים מורכבים, 2-3 שלבים, מספרים גדולים יותר

---

## 3. Scoring Engine

### 3.1 Base Points by Difficulty

- EASY: `10`
- MEDIUM: `20`
- HARD: `35`

### 3.2 Speed Multiplier

`speedFactor = clamp(0.5, 1.5, 1.5 - (responseTimeMs / maxTimeMs))`

- מהיר מאוד => בונוס משמעותי
- איטי => בונוס נמוך

### 3.3 Streak Bonus

- כל 3 תשובות נכונות ברצף: `+8`
- כל 5 תשובות נכונות ברצף: `+15`

### 3.4 Wrong Answer Penalty

- קנס בסיסי: `-5`
- אם במסלול HIGHWAY: קנס מוגדל `-8`
- לא יורדים מתחת ל-0 התקדמות

### 3.5 Final Delta

תשובה נכונה:

`delta = round((basePoints * speedFactor + streakBonus) * pathMultiplier * balanceMultiplier) + luckModifier`

תשובה שגויה:

`delta = -penalty`

---

## 4. Path Decision Event (Probabilistic)

לאחר תשובה נכונה, בהסתברות בסיסית:

- `P(PATH_DECISION) = 18%`

התלמיד בוחר:

### 4.1 HIGHWAY (אוטוסטרדה)

- השאלה הבאה: HARD (או מדרגה אחת למעלה)
- תגמול: `pathMultiplier = 1.8`
- סיכון: קנס מוגדל בתשובה שגויה

### 4.2 DIRT_ROAD (דרך עפר)

- 2-3 שאלות EASY/MEDIUM
- תגמול יציב: `pathMultiplier = 1.1`
- סיכון נמוך: קנס רגיל

---

## 5. Luck / Event Engine

לאחר תשובה נכונה (או בנקודות זמן מוגדרות) תתכן הפעלת אירוע:

- **TURBO**: `+40` התקדמות מיידית
- **BOOST**: `+20` התקדמות מיידית
- **HINT**: רמז בשאלה הבאה (למשל צמצום אפשרויות)
- **SWAP_QUESTION**: אפשרות החלפת שאלה פעם אחת
- **MALFUNCTION**: `-15` התקדמות (תקלה)
- **SLOWDOWN**: מקדם מהירות נמוך לשאלה הבאה

התפלגות מומלצת:

- אירועים חיוביים: 65%
- אירועים שליליים: 35%

---

## 6. Hidden Balance Mechanism

מטרה: לשמור על תחרות צמודה ולא לשבור מוטיבציה של תלמידים מאחור.

כלל איזון:

- מחשבים פער מהממוצע או מהמוביל
- אם תלמיד מפגר ביותר מ-`150` נקודות:
  - `balanceMultiplier = 1.15`
- אם מפגר ביותר מ-`250` נקודות:
  - `balanceMultiplier = 1.25`
- אם תלמיד מוביל בפער גדול:
  - `balanceMultiplier = 0.95`

הערות:

- האיזון אינו מוצג לתלמידים
- הערך מעודן ולא דרמטי כדי לשמר תחושת הוגנות

---

## 7. Race Lifecycle

1. `LOBBY` - תלמידים מצטרפים
2. `RUNNING` - שאלות ותשובות בזמן אמת
3. `FINISHED` - מנצח נקבע, שמירת תוצאות

Finish conditions:

- משתתף הגיע ל-1000
- או המורה עצר ידנית
- או timeout מרוץ גלובלי (אופציונלי)

---

## 8. Real-Time Event Pipeline (SSE)

בכל submit תשובה:

1. אימות תשובה + חישוב ניקוד
2. עדכון `race_participants`
3. שמירת `answers` ו-`game_events`
4. חישוב leaderboard
5. שידור SSE:
   - `position_update`
   - `leaderboard_update`
   - `game_event`
   - `overtake` (אם חל שינוי מיקום בין שני משתתפים)
6. אם יש מנצח: `race_finished`

---

## 9. Anti-Cheat / Fair Play

- שאלה תקפה לפרק זמן מוגבל (`maxTimeMs`)
- מניעת submit כפול לאותה שאלה (`is_answered`)
- בדיקת `questionId` שייך למשתתף
- server-side validation לתשובות וניקוד
- rate limit בסיסי לבקשות תשובה

---

## 10. Suggested Runtime Classes

- `GameSession`
  - `roomId`
  - `status`
  - `Map<participantId, RuntimeParticipantState>`
  - `leaderboardSnapshot`
- `RuntimeParticipantState`
  - `currentPathChoice`
  - `activeEffects` (slowdown/hint/etc.)
  - `pendingDecision`
  - `lastKnownRank`
