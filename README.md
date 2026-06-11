# Math Race - Classroom Math Racing Game

Real-time classroom game for math practice.  
Teachers create race rooms and approve registrations, students browse open races (or join by code), and race progress is streamed live.

## Tech Stack

- Frontend: React + JSX (JavaScript)
- Backend: Java (Spring Boot)
- Database: MySQL
- Realtime: SSE (Server-Sent Events)
- Authentication:
  - Teacher login (email/password + Google)
  - Student registration by open race list or room code

## Project Structure

```text
Math_Race/
  docs/
    system-spec.md
    db-schema.sql
    api-contract.md
    game-logic.md
  backend/
    pom.xml
    src/main/java/com/mathrace/...
    src/main/resources/application.yml
  frontend/
    package.json
    index.html
    vite.config.js
    src/
      App.jsx
      main.jsx
      components/*.jsx
      services/*.js
      hooks/*.js
```

## Implemented So Far

### Documentation

- Full system spec: `docs/system-spec.md`
- Full MySQL schema: `docs/db-schema.sql`
- Full API contract: `docs/api-contract.md`
- Game logic and balancing model: `docs/game-logic.md`

### Backend (Spring Boot)

- Layered architecture:
  - `controller`
  - `service`
  - `repository`
  - `entity`
  - `dto`
- Core game modules:
  - `GameEngineService`
  - `QuestionGeneratorService`
  - `ScoringEngine`
  - `LuckEventEngine`
  - `SseEventPublisher`
- API endpoints for:
  - teacher auth, race management, and participant approval
  - student open race list, registration, question/answer/path selection
  - room stream and final results

### Frontend (React JSX)

- Teacher screens:
  - login
  - dashboard
  - create race
  - lobby
  - live race dashboard
  - final results
- Student screens:
  - open races + room registration
  - live race screen
  - question card
  - path decision flow
- Real-time updates via SSE.
- In-page English documentation blocks added to core screens.

## Run Locally

### 1) Database (MySQL)

Install local MySQL server, create a database named `math_race`, then run schema script:

```bash
mysql -u root -proot math_race < docs/db-schema.sql
```

### 2) Backend

Requirements: Java 21 + Maven

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

If Maven is installed globally, you can use `mvn spring-boot:run` instead.

For a lightweight local database without MySQL, run the backend with the `h2` profile:

```powershell
cd backend
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=h2
```

The H2 profile stores data in `backend/data/math_race`, so teacher accounts and race rooms remain after restarting the server.

### 3) Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4) Google Login Setup (Teacher)

Frontend:

- Copy `frontend/.env.example` to `frontend/.env`
- Set `VITE_GOOGLE_CLIENT_ID` to your Google OAuth Client ID

Backend:

- In `backend/src/main/resources/application.yml`, set:
  - `app.auth.google-client-id` to the same Client ID

## Current Status

- Planning + architecture docs: complete
- Backend core flow: complete for classroom race submission scope
- Frontend teacher/student flows: complete for submission scope
- SSE live updates + final results: complete
- Frontend build: passing
