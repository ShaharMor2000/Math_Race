# API Contract - Math Race (v1)

Base URL: `/api/v1`

Data format: `application/json`

Realtime stream: `text/event-stream` (SSE)

---

## 1. Authentication

### 1.1 Teacher Login

`POST /auth/teacher/login`

Request:

```json
{
  "email": "dana@school.org",
  "password": "StrongPass123!"
}
```

### 1.2 Teacher Login with Google

`POST /auth/teacher/google`

Request:

```json
{
  "idToken": "google-id-token"
}
```

Response `200`:

```json
{
  "accessToken": "jwt-token",
  "teacher": {
    "id": 101,
    "fullName": "Dana Levi",
    "email": "dana@gmail.com"
  }
}
```

Response `200`:

```json
{
  "accessToken": "jwt-token",
  "teacher": {
    "id": 101,
    "fullName": "Dana Levi",
    "email": "dana@school.org"
  }
}
```

---

## 2. Teacher Race Management

> Teacher identity is passed by `X-Teacher-Id` header.

### 2.1 Create Race Room

`POST /teacher/races`

Request:

```json
{
  "title": "חשבון כיתה ה2",
  "className": "ה2",
  "maxParticipants": 8,
  "questionTimeMs": 15000,
  "initialDifficulty": "MEDIUM",
  "enableLuckEvents": true,
  "enablePathChoice": true
}
```

Response `201`:

```json
{
  "roomId": 555,
  "roomCode": "Q7P2KD",
  "status": "LOBBY"
}
```

### 2.2 List Teacher Rooms

`GET /teacher/races`

Response `200`:

```json
[
  {
    "roomId": 555,
    "roomCode": "Q7P2KD",
    "title": "חשבון כיתה ה2",
    "status": "LOBBY",
    "participants": 4,
    "createdAt": "2026-05-24T20:10:00Z"
  }
]
```

### 2.3 Get Room Lobby Details

`GET /teacher/races/{roomCode}`

Response `200`:

```json
{
  "roomId": 555,
  "roomCode": "Q7P2KD",
  "status": "LOBBY",
  "participants": [
    {
      "participantId": 901,
      "studentId": 301,
      "displayName": "נועה",
      "laneNo": 1,
      "carColor": "blue",
      "progressPoints": 0
    }
  ]
}
```

### 2.4 Start Race

`POST /teacher/races/{roomCode}/start`

Response `200`:

```json
{
  "roomCode": "Q7P2KD",
  "status": "RUNNING",
  "startedAt": "2026-05-24T20:15:10Z"
}
```

### 2.5 End Race (manual stop)

`POST /teacher/races/{roomCode}/end`

Response `200`:

```json
{
  "roomCode": "Q7P2KD",
  "status": "FINISHED"
}
```

### 2.6 Approve Participant Registration

`POST /teacher/races/{roomCode}/participants/{participantId}/approve`

Response `200`:

```json
{
  "participantId": 905,
  "participantStatus": "ACTIVE"
}
```

### 2.7 Reject Participant Registration

`POST /teacher/races/{roomCode}/participants/{participantId}/reject`

Response `200`:

```json
{
  "participantId": 905,
  "participantStatus": "REJECTED"
}
```

---

## 3. Student Flow

### 3.1 List Open Races

`GET /student/races/open`

Response `200`:

```json
[
  {
    "roomCode": "Q7P2KD",
    "title": "חשבון כיתה ה2",
    "className": "ה2",
    "registeredCount": 4,
    "maxParticipants": 8
  }
]
```

### 3.2 Join by Room Code

`POST /student/join`

Request:

```json
{
  "roomCode": "Q7P2KD",
  "displayName": "יואב"
}
```

Response `200`:

```json
{
  "studentToken": "student-session-token",
  "student": {
    "studentId": 304,
    "displayName": "יואב"
  },
  "participant": {
    "participantId": 905,
    "laneNo": 5,
    "carColor": "yellow",
    "participantStatus": "PENDING"
  },
  "room": {
    "roomCode": "Q7P2KD",
    "status": "LOBBY"
  }
}
```

> Participant starts as `PENDING` until teacher approval.

### 3.3 Get Next Question

`GET /student/races/{roomCode}/question`

Headers:

- `X-Participant-Id: {participantId}`

Response `200`:

```json
{
  "questionId": 7001,
  "difficulty": "MEDIUM",
  "questionText": "8 x 7 = ?",
  "options": ["54", "56", "64", "58"],
  "maxTimeMs": 15000,
  "issuedAt": "2026-05-24T20:16:05Z"
}
```

### 3.4 Submit Answer

`POST /student/races/{roomCode}/answer`

Request:

```json
{
  "questionId": 7001,
  "submittedAnswer": "56",
  "responseTimeMs": 4300
}
```

Response `200`:

```json
{
  "isCorrect": true,
  "deltaPoints": 34,
  "newProgress": 368,
  "newScore": 492,
  "streakCount": 3,
  "triggeredEvent": {
    "type": "BOOST",
    "impactPoints": 25,
    "message": "בוסט קטן! +25"
  }
}
```

### 3.5 Choose Path (when PATH_DECISION event occurs)

`POST /student/races/{roomCode}/path`

Request:

```json
{
  "choice": "HIGHWAY"
}
```

Response `200`:

```json
{
  "choice": "HIGHWAY",
  "nextQuestionDifficulty": "HARD",
  "rewardMultiplier": 1.8,
  "penaltyMultiplier": 1.2
}
```

---

## 4. Results

### 4.1 Final Results by Room

`GET /races/{roomCode}/results`

Response `200`:

```json
{
  "roomCode": "Q7P2KD",
  "winnerParticipantId": 901,
  "leaderboard": [
    {
      "rank": 1,
      "displayName": "נועה",
      "finalProgress": 1000,
      "finalScore": 1250,
      "accuracyPct": 88.89
    }
  ]
}
```

---

## 5. SSE Streams

### 5.1 Subscribe to Room Stream

`GET /stream/rooms/{roomCode}`

Query params:

- `role=teacher|student`
- `participantId` (required for student personal events)

SSE event types:

- `race_started`
- `position_update`
- `leaderboard_update`
- `game_event`
- `overtake`
- `bonus`
- `registration_requested`
- `registration_approved`
- `registration_rejected`
- `question_ready` (personal)
- `race_finished`
- `heartbeat`

Example payload:

```json
{
  "roomCode": "Q7P2KD",
  "timestamp": "2026-05-24T20:16:11Z",
  "leaderboard": [
    { "participantId": 901, "displayName": "נועה", "progress": 422, "rank": 1 }
  ]
}
```

---

## 6. Error Model

HTTP + standardized body:

```json
{
  "code": "ROOM_FULL",
  "message": "החדר מלא",
  "details": null
}
```

Common error codes:

- `INVALID_CREDENTIALS`
- `UNAUTHORIZED`
- `ROOM_NOT_FOUND`
- `ROOM_FULL`
- `RACE_ALREADY_RUNNING`
- `QUESTION_EXPIRED`
- `INVALID_ANSWER_PAYLOAD`
- `PARTICIPANT_NOT_FOUND`
- `ROOM_NOT_RUNNING`
