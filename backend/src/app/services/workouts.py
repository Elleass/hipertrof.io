from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app import models
from app.config import settings
from app.schemas import AddSetRequest, SmartAutofillRead, StatisticsSummary, WorkoutSummary


def current_athlete_id() -> int:
    return settings.demo_athlete_id


def get_session_for_athlete(db: Session, session_id: int) -> models.WorkoutSession:
    session = db.scalar(
        select(models.WorkoutSession)
        .where(
            models.WorkoutSession.id == session_id,
            models.WorkoutSession.athlete_id == current_athlete_id(),
        )
        .options(
            selectinload(models.WorkoutSession.exercises)
            .selectinload(models.WorkoutExercise.sets),
            selectinload(models.WorkoutSession.exercises)
            .selectinload(models.WorkoutExercise.exercise),
        )
    )
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout session not found")
    return session


def start_session(db: Session, notes: str | None = None, plan_id: int | None = None, planned_session_id: int | None = None) -> models.WorkoutSession:
    session = models.WorkoutSession(
        athlete_id=current_athlete_id(),
        plan_id=plan_id,
        planned_session_id=planned_session_id,
        status=models.WorkoutStatus.IN_PROGRESS,
        notes=notes,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return get_session_for_athlete(db, session.id)


def add_exercise(db: Session, session_id: int, exercise_id: int) -> models.WorkoutExercise:
    session = get_session_for_athlete(db, session_id)
    if session.status != models.WorkoutStatus.IN_PROGRESS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only in-progress sessions can be edited")

    exercise = db.get(models.Exercise, exercise_id)
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")

    workout_exercise = models.WorkoutExercise(
        workout_session_id=session.id,
        exercise_id=exercise_id,
        order_index=len(session.exercises) + 1,
    )
    db.add(workout_exercise)
    db.commit()
    return get_workout_exercise_for_athlete(db, workout_exercise.id)


def get_workout_exercise_for_athlete(db: Session, workout_exercise_id: int) -> models.WorkoutExercise:
    workout_exercise = db.scalar(
        select(models.WorkoutExercise)
        .join(models.WorkoutSession)
        .where(
            models.WorkoutExercise.id == workout_exercise_id,
            models.WorkoutSession.athlete_id == current_athlete_id(),
        )
        .options(
            selectinload(models.WorkoutExercise.exercise),
            selectinload(models.WorkoutExercise.sets),
        )
    )
    if workout_exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout exercise not found")
    return workout_exercise


def add_set(db: Session, workout_exercise_id: int, payload: AddSetRequest) -> models.WorkoutSet:
    workout_exercise = db.scalar(
        select(models.WorkoutExercise)
        .join(models.WorkoutSession)
        .where(
            models.WorkoutExercise.id == workout_exercise_id,
            models.WorkoutSession.athlete_id == current_athlete_id(),
            models.WorkoutSession.status == models.WorkoutStatus.IN_PROGRESS,
        )
        .options(selectinload(models.WorkoutExercise.sets))
    )
    if workout_exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout exercise not found")

    workout_set = models.WorkoutSet(
        workout_exercise_id=workout_exercise.id,
        set_number=len(workout_exercise.sets) + 1,
        weight=payload.weight,
        reps=payload.reps,
        rest_seconds=payload.rest_seconds,
        rpe=payload.rpe,
        completed=payload.completed,
    )
    db.add(workout_set)
    db.commit()
    db.refresh(workout_set)
    return workout_set


def complete_session(db: Session, session_id: int) -> WorkoutSummary:
    session = get_session_for_athlete(db, session_id)
    completed_sets = [workout_set for exercise in session.exercises for workout_set in exercise.sets if workout_set.completed]
    if not session.exercises or not completed_sets:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A completed workout needs at least one exercise and one completed set",
        )

    session.status = models.WorkoutStatus.COMPLETED
    session.completed_at = datetime.now(UTC)
    db.commit()
    session = get_session_for_athlete(db, session_id)
    return workout_summary(session)


def workout_summary(session: models.WorkoutSession) -> WorkoutSummary:
    completed_sets = [workout_set for exercise in session.exercises for workout_set in exercise.sets if workout_set.completed]
    tonnage = sum(workout_set.weight * workout_set.reps for workout_set in completed_sets)
    return WorkoutSummary(session=session, tonnage=tonnage, completed_sets=len(completed_sets))


def smart_autofill(db: Session, exercise_id: int) -> SmartAutofillRead:
    row = db.execute(
        select(models.WorkoutSet, models.WorkoutSession)
        .join(models.WorkoutExercise, models.WorkoutSet.workout_exercise_id == models.WorkoutExercise.id)
        .join(models.WorkoutSession, models.WorkoutExercise.workout_session_id == models.WorkoutSession.id)
        .where(
            models.WorkoutSession.athlete_id == current_athlete_id(),
            models.WorkoutSession.status == models.WorkoutStatus.COMPLETED,
            models.WorkoutExercise.exercise_id == exercise_id,
            models.WorkoutSet.completed.is_(True),
        )
        .order_by(models.WorkoutSession.completed_at.desc(), models.WorkoutSet.set_number.desc())
        .limit(1)
    ).first()
    if row is None:
        return SmartAutofillRead(exercise_id=exercise_id)

    workout_set, session = row
    return SmartAutofillRead(
        exercise_id=exercise_id,
        suggested_weight=workout_set.weight,
        suggested_reps=workout_set.reps,
        source_session_id=session.id,
        source_date=session.completed_at,
    )


def statistics_summary(db: Session) -> StatisticsSummary:
    completed_workouts = db.scalar(
        select(func.count(models.WorkoutSession.id)).where(
            models.WorkoutSession.athlete_id == current_athlete_id(),
            models.WorkoutSession.status == models.WorkoutStatus.COMPLETED,
        )
    ) or 0

    rows = db.execute(
        select(models.Exercise.name, models.WorkoutSet.weight, models.WorkoutSet.reps)
        .join(models.WorkoutExercise, models.WorkoutSet.workout_exercise_id == models.WorkoutExercise.id)
        .join(models.Exercise, models.WorkoutExercise.exercise_id == models.Exercise.id)
        .join(models.WorkoutSession, models.WorkoutExercise.workout_session_id == models.WorkoutSession.id)
        .where(
            models.WorkoutSession.athlete_id == current_athlete_id(),
            models.WorkoutSession.status == models.WorkoutStatus.COMPLETED,
            models.WorkoutSet.completed.is_(True),
        )
    ).all()

    personal_records: dict[str, float] = {}
    total_tonnage = 0.0
    for exercise_name, weight, reps in rows:
        total_tonnage += weight * reps
        personal_records[exercise_name] = max(personal_records.get(exercise_name, 0), weight)

    achievements = []
    if completed_workouts >= 1:
        achievements.append("First completed workout")
    if completed_workouts >= 10:
        achievements.append("10 completed workouts")
    if total_tonnage >= 10000:
        achievements.append("10,000 kg total tonnage")

    return StatisticsSummary(
        completed_workouts=completed_workouts,
        total_tonnage=total_tonnage,
        personal_records=personal_records,
        achievements=achievements,
    )


def survey_recommendation(payload: models.PreWorkoutSurvey) -> models.SurveyRecommendation:
    readiness = payload.sleep_quality + payload.motivation_level - payload.fatigue_level - payload.soreness_level
    if readiness <= 0:
        return models.SurveyRecommendation.LIGHT
    if readiness >= 4:
        return models.SurveyRecommendation.HEAVY
    return models.SurveyRecommendation.NORMAL
