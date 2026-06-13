from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload

from app import models
from app.database import get_db
from app.schemas import (
    AddExerciseRequest,
    AddSetRequest,
    SmartAutofillRead,
    StartWorkoutRequest,
    StatisticsSummary,
    SurveyRead,
    SurveyRequest,
    UpdateSetRequest,
    WorkoutExerciseRead,
    WorkoutHistoryItem,
    WorkoutSessionRead,
    WorkoutSetRead,
    WorkoutSummary,
)
from app.services import workouts

router = APIRouter(tags=["workouts"])


@router.post("/workout-sessions/start", response_model=WorkoutSessionRead)
def start_workout(payload: StartWorkoutRequest, db: Session = Depends(get_db)) -> models.WorkoutSession:
    return workouts.start_session(db, payload.notes, payload.plan_id, payload.planned_session_id)


@router.get("/workout-sessions", response_model=list[WorkoutSessionRead])
def list_sessions(db: Session = Depends(get_db)) -> list[models.WorkoutSession]:
    return list(
        db.scalars(
            select(models.WorkoutSession)
            .where(models.WorkoutSession.athlete_id == workouts.current_athlete_id())
            .order_by(models.WorkoutSession.started_at.desc())
            .options(
                selectinload(models.WorkoutSession.exercises)
                .selectinload(models.WorkoutExercise.sets),
                selectinload(models.WorkoutSession.exercises)
                .selectinload(models.WorkoutExercise.exercise),
            )
        ).all()
    )


@router.get("/workout-sessions/active", response_model=WorkoutSessionRead | None)
def active_session(planned_session_id: int | None = None, db: Session = Depends(get_db)) -> models.WorkoutSession | None:
    return workouts.active_session(db, planned_session_id)


@router.get("/workout-sessions/{session_id}", response_model=WorkoutSessionRead)
def get_session(session_id: int, db: Session = Depends(get_db)) -> models.WorkoutSession:
    return workouts.get_session_for_athlete(db, session_id)


@router.post("/workout-sessions/{session_id}/exercises", response_model=WorkoutExerciseRead)
def add_exercise(session_id: int, payload: AddExerciseRequest, db: Session = Depends(get_db)) -> models.WorkoutExercise:
    return workouts.add_exercise(db, session_id, payload.exercise_id)


@router.post("/workout-exercises/{workout_exercise_id}/sets", response_model=WorkoutSetRead)
def add_set(workout_exercise_id: int, payload: AddSetRequest, db: Session = Depends(get_db)) -> models.WorkoutSet:
    return workouts.add_set(db, workout_exercise_id, payload)


@router.patch("/workout-sets/{workout_set_id}", response_model=WorkoutSetRead)
def update_set(workout_set_id: int, payload: UpdateSetRequest, db: Session = Depends(get_db)) -> models.WorkoutSet:
    return workouts.update_set(db, workout_set_id, payload)


@router.post("/workout-sessions/{session_id}/complete", response_model=WorkoutSummary)
def complete_session(session_id: int, db: Session = Depends(get_db)) -> WorkoutSummary:
    return workouts.complete_session(db, session_id)


@router.get("/smart-autofill", response_model=SmartAutofillRead)
def smart_autofill(exercise_id: int, db: Session = Depends(get_db)) -> SmartAutofillRead:
    return workouts.smart_autofill(db, exercise_id)


@router.get("/statistics/summary", response_model=StatisticsSummary)
def statistics_summary(db: Session = Depends(get_db)) -> StatisticsSummary:
    return workouts.statistics_summary(db)


@router.get("/history", response_model=list[WorkoutHistoryItem])
def workout_history(db: Session = Depends(get_db)) -> list[WorkoutHistoryItem]:
    return workouts.workout_history(db)


@router.get("/history/{session_id}", response_model=WorkoutSessionRead)
def workout_history_detail(session_id: int, db: Session = Depends(get_db)) -> models.WorkoutSession:
    session = workouts.get_session_for_athlete(db, session_id)
    if session.status != models.WorkoutStatus.COMPLETED:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nie znaleziono ukończonego treningu")
    return session


@router.post("/workout-sessions/{session_id}/survey", response_model=SurveyRead)
def save_survey(session_id: int, payload: SurveyRequest, db: Session = Depends(get_db)) -> models.PreWorkoutSurvey:
    workouts.get_session_for_athlete(db, session_id)
    survey = models.PreWorkoutSurvey(
        workout_session_id=session_id,
        sleep_quality=payload.sleep_quality,
        fatigue_level=payload.fatigue_level,
        soreness_level=payload.soreness_level,
        motivation_level=payload.motivation_level,
        recommendation=models.SurveyRecommendation.NORMAL,
    )
    survey.recommendation = workouts.survey_recommendation(survey)
    db.add(survey)
    db.commit()
    db.refresh(survey)
    return survey
