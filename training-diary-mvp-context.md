# Training Diary MVP Context

## 1. Project Identity

**Product name:** Hipertrof.io
**Product type:** Web application prototype for workout planning, workout logging, progress tracking, and basic coach-athlete cooperation.  
**Primary users:**
- **Athlete:** logs strength workouts, follows workout plans, tracks progress, fills pre-workout readiness surveys, receives suggestions.
- **Coach:** creates workout plans, assigns them to athletes, reviews athlete progress, leaves notes or comments.
- **External activity provider:** Strava or a mocked Strava-like service providing cardio activity data.
- **Notification service:** e-mail or push notification provider. In MVP this can be implemented as a stub/mock.

## 2. Product Problem

Existing workout logging applications often require too much manual input during training. The user must repeatedly enter weight, reps, sets, and other parameters, which distracts from the actual workout. Most existing tools also treat strength training and cardio as separate contexts and provide limited support for coach-athlete cooperation.

The MVP should prove that the system can make workout logging faster and more useful by:
- reducing manual input through **Smart Auto-fill**,
- storing structured workout history,
- supporting basic workout plans,
- giving simple progress feedback,
- optionally using external activity data or a pre-workout survey to suggest workout intensity.

## 3. MVP Objective

Build a working prototype that demonstrates the core user value:

> An athlete can start a planned or ad-hoc strength workout, quickly log sets using Smart Auto-fill based on previous sessions, finish the workout, and see basic progress/statistics.

The MVP should focus on the main flow rather than full production completeness. Coach features, Strava integration, notifications, and gamification should be implemented only in the smallest scope needed to demonstrate the concept.

## 4. MVP Scope

### 4.1 Must Have


#### Exercise library
- Predefined exercise list.
- Exercise attributes:
  - name,
  - category,
  - muscle group,
  - optional notes/technique URL.

#### Workout plans
- Athlete or coach can create a basic workout plan.
- A plan contains planned workout sessions.
- A planned session contains planned exercises.
- Coach can assign a plan to an athlete in a simplified way.

#### Workout session logging
- Athlete can start a workout session.
- Athlete can add exercises to the session.
- Athlete can log sets with:
  - weight,
  - reps,
  - optional rest time,
  - optional RPE/difficulty.
- Athlete can finish a session.
- System validates that a completed workout contains at least one exercise and one completed set.

#### Smart Auto-fill
- When athlete adds an exercise, the system finds the latest previous set data for that exercise and suggests weight and reps.
- User can accept the suggestion with one click or manually edit the values.
- Smart Auto-fill should be optimized for the common case: same exercise repeated across multiple workouts.

#### Basic statistics
- Total workout count.
- Total tonnage per workout: `sum(weight * reps)` for all completed sets.
- Exercise progress based on historical set data.
- Basic personal record detection, for example highest weight for an exercise.

#### Basic gamification
- Simple badge/achievement generation based on tonnage, completed workouts, or consistency.
- Example: first completed workout, total tonnage threshold, weekly streak.
- Abstract summary can be simple and rule-based, e.g. converting monthly tonnage into a humorous comparison.

### 4.2 Should Have

#### Pre-workout survey
- Before starting a session, athlete can fill a short readiness survey:
  - sleep quality,
  - fatigue level,
  - soreness level,
  - motivation/energy level.
- System generates a simple recommendation: `light`, `normal`, or `heavy` training day.



### 4.4 Out of Scope for MVP


- Basic e-mail or in-app notification when a plan is assigned.
- Exercise alternatives if equipment is unavailable.
- One-rep max calculator.
- UI customization.
- More detailed charts.

#### User account and roles
- User registration and login.
- Role support: `ATHLETE`, `COACH`.
- Basic authenticated session using JWT or equivalent token-based authentication.

#### Coach-athlete cooperation
- Coach can invite athlete or create a simplified coach-athlete link.
- Athlete must accept the relationship.
- Coach can view assigned athlete training history.
- Coach can add notes to plans or completed sessions.

#### External cardio activity integration
- MVP can use a mocked Strava adapter instead of real OAuth integration.
- System stores external activities such as run or ride.
- External activity load can be used in the readiness/intensity suggestion.

- Full native mobile application.
- Full social feed.
- Advanced AI coaching recommendations.
- Production-grade Strava OAuth integration if time is limited.
- Complex training periodization logic.
- Real push notification infrastructure.
- Payment/subscription system.
- Complex analytics dashboard.
- Full offline mode.

## 5. Core User Journeys

### 5.1 Athlete logs a workout with Smart Auto-fill

1. Athlete logs in.
2. Athlete opens dashboard.
3. Athlete starts a planned or ad-hoc workout.
4. System optionally shows pre-workout survey.
5. Athlete selects an exercise, e.g. bench press.
6. System checks previous sessions and suggests last used weight and reps.
7. Athlete accepts suggested values or edits them.
8. Athlete saves sets.
9. Athlete finishes workout.
10. System saves session, updates statistics, and displays summary.

### 5.2 Coach assigns a workout plan

1. Coach logs in.
2. Coach creates a workout plan.
3. Coach adds sessions and exercises to the plan.
4. Coach assigns the plan to an athlete.
5. Athlete sees assigned plan in the dashboard.
6. Athlete performs sessions from the plan.
7. Coach can review completed sessions and add notes.

### 5.3 Athlete reviews progress

1. Athlete opens statistics view.
2. System loads completed sessions and sets.
3. Athlete sees total workouts, tonnage, and exercise progress.
4. System shows badges or simple motivational summary.

## 6. Business Rules

| ID | Rule |
|---|---|
| BR-01 | A completed workout session must contain at least one exercise and one completed set. |
| BR-02 | Only the owner of a workout session can modify its workout data. |
| BR-03 | A coach can access athlete data only after the athlete accepts the coach-athlete relationship. |
| BR-04 | Smart Auto-fill uses the latest completed set data for the same exercise and same athlete. |
| BR-05 | External activity data should not block strength workout logging if Strava or the adapter is unavailable. |
| BR-06 | Statistics are calculated only from completed sessions. |
| BR-07 | Cancelled or missed sessions are visible in history but do not count toward tonnage and progress statistics. |
| BR-08 | User roles must be enforced on protected API endpoints. |

## 7. Session State Model

Workout session lifecycle:

- `PLANNED` — session created but not started.
- `IN_PROGRESS` — athlete is currently logging workout data.
- `PAUSED` — workout is temporarily paused.
- `COMPLETED` — workout is finished and statistics are updated.
- `CANCELLED` — workout was abandoned by the user.
- `MISSED` — planned workout was not started in expected time.

Only `COMPLETED` sessions should be used for Smart Auto-fill and progress statistics.

## 8. Suggested Technical Stack

### Frontend
- React
- TypeScript
- Vite
- React Router
- TanStack Query or Axios for API communication
- Basic component library or custom CSS

### Backend
- Python
- FastAPI
- SQLAlchemy
- Alembic
- Pydantic
- JWT authentication

### Database
- PostgreSQL

### Infrastructure
- Docker
- Docker Compose

### Testing
- Backend unit tests: pytest
- Frontend unit/component tests: Vitest or Jest
- E2E tests: Playwright
- Integration tests: pytest + test database

## 9. High-Level Architecture

Recommended MVP architecture: **modular monolith**.

```text
React SPA
   |
   | REST API / JSON
   v
FastAPI Backend
   |-- Auth module
   |-- Users module
   |-- Workout plans module
   |-- Workout sessions module
   |-- Smart Auto-fill service
   |-- Statistics module
   |-- Gamification module
   |-- Coach-athlete module
   |-- Strava adapter / mock external activity adapter
   |-- Notification adapter / mock
   v
PostgreSQL
```

The system should keep external integrations behind adapters. If Strava API or notification service is unavailable, the internal workout logging flow should still work.

## 10. Initial Domain Model

### User
- id
- email
- password_hash
- name
- role: `ATHLETE` or `COACH`
- created_at

### CoachAthleteRelation
- id
- coach_id
- athlete_id
- status: `PENDING`, `ACCEPTED`, `REJECTED`
- created_at

### Exercise
- id
- name
- category
- muscle_group
- technique_url

### WorkoutPlan
- id
- owner_id
- assigned_athlete_id
- name
- description
- created_at

### PlannedSession
- id
- plan_id
- name
- scheduled_date
- order_index

### PlannedExercise
- id
- planned_session_id
- exercise_id
- target_sets
- target_reps
- target_weight
- notes

### WorkoutSession
- id
- athlete_id
- plan_id nullable
- planned_session_id nullable
- status
- started_at
- completed_at
- notes

### WorkoutExercise
- id
- workout_session_id
- exercise_id
- order_index

### WorkoutSet
- id
- workout_exercise_id
- set_number
- weight
- reps
- rest_seconds nullable
- rpe nullable
- completed

### PreWorkoutSurvey
- id
- workout_session_id
- sleep_quality
- fatigue_level
- soreness_level
- motivation_level
- recommendation: `LIGHT`, `NORMAL`, `HEAVY`

### ExternalActivity
- id
- athlete_id
- source
- activity_type
- distance
- duration_seconds
- load_score
- activity_date

### Achievement
- id
- athlete_id
- type
- title
- description
- unlocked_at

## 11. API Draft

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Users and relations
- `GET /users/me`
- `POST /coach-athlete/invitations`
- `POST /coach-athlete/invitations/{id}/accept`
- `GET /coach-athlete/athletes`

### Exercises
- `GET /exercises`
- `POST /exercises`
- `GET /exercises/{id}`

### Plans
- `GET /plans`
- `POST /plans`
- `GET /plans/{id}`
- `POST /plans/{id}/assign`
- `POST /plans/{id}/sessions`
- `POST /planned-sessions/{id}/exercises`

### Workout sessions
- `POST /workout-sessions/start`
- `GET /workout-sessions/{id}`
- `POST /workout-sessions/{id}/exercises`
- `POST /workout-exercises/{id}/sets`
- `PATCH /workout-sets/{id}`
- `POST /workout-sessions/{id}/complete`
- `POST /workout-sessions/{id}/cancel`

### Smart Auto-fill
- `GET /smart-autofill?exercise_id={exercise_id}`

Response example:

```json
{
  "exercise_id": 1,
  "suggested_weight": 80,
  "suggested_reps": 10,
  "source_session_id": 25,
  "source_date": "2026-05-20"
}
```

### Statistics
- `GET /statistics/summary`
- `GET /statistics/exercises/{exercise_id}`
- `GET /statistics/tonnage`

### Survey
- `POST /workout-sessions/{id}/survey`

### External activities
- `GET /external-activities`
- `POST /external-activities/mock-sync`

### Achievements
- `GET /achievements`

## 12. Smart Auto-fill Logic

Minimum implementation:

1. Receive `athlete_id` from authenticated user.
2. Receive selected `exercise_id`.
3. Query latest `COMPLETED` workout session containing this exercise.
4. Select last completed set or best matching set pattern.
5. Return suggested weight and reps.
6. If no previous data exists, return empty suggestion.

Pseudo-logic:

```text
find latest completed WorkoutSet
where WorkoutSet.exercise_id == selected exercise
and WorkoutSession.athlete_id == current user
order by WorkoutSession.completed_at desc, WorkoutSet.set_number asc
return weight and reps
```

For MVP, the system does not need advanced progression algorithms. It only needs to reduce manual input by reusing the latest known values.

## 13. Statistics and Gamification Logic

### Tonnage

```text
tonnage = sum(weight * reps) for all completed sets in completed sessions
```

### Personal record

```text
personal_record = max(weight) for selected exercise and athlete
```

### Basic achievements

Examples:

| Achievement | Rule |
|---|---|
| First Workout | User completed first workout. |
| 10 Workouts | User completed 10 workouts. |
| 10,000 kg Tonnage | User reached total tonnage of 10,000 kg. |
| Consistency Badge | User completed at least 3 workouts in one week. |

## 14. Frontend MVP Screens

### Public screens
- Login
- Register

### Athlete screens
- Dashboard
- Workout plans list
- Start workout screen
- Active workout logging screen
- Exercise picker
- Smart Auto-fill set form
- Workout summary
- Statistics page
- Achievements page

### Coach screens
- Coach dashboard
- Athlete list
- Create workout plan
- Assign plan to athlete
- Athlete progress preview

### Admin/dev-only screens, optional
- Seed exercise library
- Mock Strava sync trigger

## 15. Non-Functional Requirements

### Usability
- Workout logging must require minimal interaction.
- Accepting Smart Auto-fill should be possible with one obvious action.
- Active workout screen should avoid unnecessary complexity.

### Security
- Authentication required for all private endpoints.
- Athlete data must be isolated per user.
- Coach can access athlete data only after accepted relationship.
- JWT must be validated on protected routes.
- Input data must be validated by backend schemas.

### Performance
- Smart Auto-fill should respond quickly because it is part of the active workout flow.
- Add indexes for frequent lookups:
  - `workout_sessions(athlete_id, status, completed_at)`
  - `workout_exercises(exercise_id)`
  - `workout_sets(workout_exercise_id)`
- Statistics can be computed on demand for MVP; caching can be added later.

### Reliability
- Workout logging should not depend on Strava availability.
- Notification failures should not block workout completion.
- External services should be accessed through adapters.

## 16. Testing Strategy

### Unit tests
- Tonnage calculation.
- Achievement generation.
- Smart Auto-fill selection logic.
- Workout validation: minimum one exercise and one completed set.
- Survey recommendation logic.

### Integration tests
- API + PostgreSQL test database.
- Creating workout plan and session.
- Completing workout session and updating statistics.
- Coach-athlete authorization rules.
- Mock Strava adapter and notification adapter.

### E2E tests
Use Playwright for the main user path:

1. Login as athlete.
2. Start workout.
3. Add exercise.
4. Receive Smart Auto-fill suggestion.
5. Accept suggested set.
6. Complete workout.
7. Verify workout summary/statistics.

### Security tests
- Unauthorized user cannot access protected endpoints.
- Athlete cannot read another athlete's sessions.
- Coach cannot access athlete data before accepted relation.
- Invalid JWT is rejected.

### Performance tests
- Measure response time of Smart Auto-fill endpoint.
- Measure workout completion endpoint with multiple sets.
- Optional load test using Locust or k6.

## 17. CI/CD Context

Minimum CI pipeline:

1. Install backend dependencies.
2. Run backend linting/formatting.
3. Run backend unit tests.
4. Install frontend dependencies.
5. Run frontend linting/build.
6. Run frontend tests.
7. Optionally run integration tests with PostgreSQL service container.

Suggested tool: GitHub Actions.

## 18. MVP Milestones

### Milestone 1 — Project skeleton
- Docker Compose with frontend, backend, PostgreSQL.
- FastAPI health endpoint.
- React app shell.
- Database migrations configured.

### Milestone 2 — Auth and users
- Register/login.
- JWT auth.
- Roles: athlete and coach.

### Milestone 3 — Exercise and plans
- Exercise library.
- Create workout plan.
- Add planned sessions and exercises.

### Milestone 4 — Workout logging
- Start session.
- Add exercises and sets.
- Complete session.
- Validate business rules.

### Milestone 5 — Smart Auto-fill
- Query latest completed exercise data.
- Suggest weight and reps.
- Accept/edit suggested set.

### Milestone 6 — Statistics and achievements
- Tonnage summary.
- Workout history.
- Basic achievements.

### Milestone 7 — Coach workflow and external data mock
- Coach-athlete relation.
- Assign plan.
- Mock external activity sync.
- Optional survey-based intensity suggestion.

## 19. Acceptance Criteria for MVP

The MVP is complete when:

- Athlete can register, log in, and start a workout.
- Athlete can add at least one exercise and one set.
- Athlete can complete a workout and see summary.
- Smart Auto-fill suggests previous values for repeated exercises.
- Workout history is persisted in PostgreSQL.
- Basic statistics are displayed.
- Coach can create and assign a plan to an athlete.
- Coach access to athlete data is controlled by accepted relation.
- External activity integration is represented by a mock adapter or minimal Strava integration.
- Main user flow is covered by at least one E2E test.
- Project can be started with Docker Compose.

## 20. Key Risks and Simplifications

| Risk | Mitigation |
|---|---|
| Too much scope for MVP | Prioritize workout logging and Smart Auto-fill. |
| Strava OAuth takes too much time | Use mock Strava adapter first. |
| Coach workflow adds complexity | Implement minimal accepted relation and plan assignment. |
| Statistics become expensive | Compute simple statistics only; add indexes. |
| UI becomes too complex | Focus active workout screen on minimal clicks. |
| Notifications slow down core flow | Mock notifications or process them asynchronously. |

## 21. Development Priorities

1. Data model and migrations.
2. Auth and role-based access.
3. Workout logging flow.
4. Smart Auto-fill.
5. Basic statistics.
6. Coach plan assignment.
7. Mock external activity integration.
8. Tests and CI.

## 22. MVP Summary

The MVP should demonstrate a focused training diary system where the main competitive advantage is fast strength workout logging. The core proof is the Smart Auto-fill flow: the system remembers the athlete's previous exercise parameters and reduces the need for manual input during a workout. Around this core, the prototype should include basic planning, persistence, statistics, simple achievements, and a minimal coach-athlete workflow.
