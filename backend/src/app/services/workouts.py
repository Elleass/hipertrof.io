from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app import models
from app.config import settings
from app.schemas import (
    AddSetRequest,
    SmartAutofillRead,
    SmartAutofillSetRead,
    StatisticsSummary,
    UpdateSetRequest,
    WorkoutHistoryItem,
    WorkoutSummary,
)


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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nie znaleziono sesji treningowej")
    return session


def active_session(db: Session, planned_session_id: int | None = None) -> models.WorkoutSession | None:
    query = (
        select(models.WorkoutSession)
        .where(
            models.WorkoutSession.athlete_id == current_athlete_id(),
            models.WorkoutSession.status == models.WorkoutStatus.IN_PROGRESS,
        )
        .order_by(models.WorkoutSession.started_at.desc())
        .limit(1)
        .options(
            selectinload(models.WorkoutSession.exercises).selectinload(models.WorkoutExercise.sets),
            selectinload(models.WorkoutSession.exercises).selectinload(models.WorkoutExercise.exercise),
        )
    )
    if planned_session_id is not None:
        query = query.where(models.WorkoutSession.planned_session_id == planned_session_id)
    session = db.scalar(query)
    if session is None:
        return None
    return ensure_planned_session_structure(db, session)


def ensure_planned_session_structure(db: Session, session: models.WorkoutSession) -> models.WorkoutSession:
    if session.planned_session_id is None:
        return session

    planned_session = db.scalar(
        select(models.PlannedSession)
        .where(models.PlannedSession.id == session.planned_session_id)
        .options(selectinload(models.PlannedSession.exercises))
    )
    if planned_session is None:
        return session

    changed = False
    exercises_by_order = {workout_exercise.order_index: workout_exercise for workout_exercise in session.exercises}
    for index, planned_exercise in enumerate(planned_session.exercises, start=1):
        workout_exercise = exercises_by_order.get(index)
        if workout_exercise is None or workout_exercise.exercise_id != planned_exercise.exercise_id:
            workout_exercise = models.WorkoutExercise(
                workout_session_id=session.id,
                exercise_id=planned_exercise.exercise_id,
                order_index=index,
            )
            db.add(workout_exercise)
            db.flush()
            session.exercises.append(workout_exercise)
            changed = True

        existing_set_numbers = {workout_set.set_number for workout_set in workout_exercise.sets}
        for set_number in range(1, (planned_exercise.target_sets or 1) + 1):
            if set_number in existing_set_numbers:
                continue

            db.add(
                models.WorkoutSet(
                    workout_exercise_id=workout_exercise.id,
                    set_number=set_number,
                    weight=planned_exercise.target_weight or 0,
                    reps=planned_exercise.target_reps or 1,
                    completed=False,
                )
            )
            changed = True

    if not changed:
        return session

    db.commit()
    return get_session_for_athlete(db, session.id)


def start_session(db: Session, notes: str | None = None, plan_id: int | None = None, planned_session_id: int | None = None) -> models.WorkoutSession:
    planned_exercises: list[models.PlannedExercise] = []
    if planned_session_id is not None:
        existing_session = active_session(db, planned_session_id)
        if existing_session is not None:
            return existing_session

        planned_session = db.scalar(
            select(models.PlannedSession)
            .join(models.WorkoutPlan)
            .where(
                models.PlannedSession.id == planned_session_id,
                (models.WorkoutPlan.owner_id == current_athlete_id())
                | (models.WorkoutPlan.assigned_athlete_id == current_athlete_id()),
            )
            .options(selectinload(models.PlannedSession.exercises))
        )
        if planned_session is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nie znaleziono zaplanowanej sesji")
        plan_id = planned_session.plan_id
        planned_exercises = list(planned_session.exercises)

    session = models.WorkoutSession(
        athlete_id=current_athlete_id(),
        plan_id=plan_id,
        planned_session_id=planned_session_id,
        status=models.WorkoutStatus.IN_PROGRESS,
        notes=notes,
    )
    db.add(session)
    db.flush()

    for index, planned_exercise in enumerate(planned_exercises, start=1):
        workout_exercise = models.WorkoutExercise(
            workout_session_id=session.id,
            exercise_id=planned_exercise.exercise_id,
            order_index=index,
        )
        db.add(workout_exercise)
        db.flush()

        for set_number in range(1, (planned_exercise.target_sets or 1) + 1):
            db.add(
                models.WorkoutSet(
                    workout_exercise_id=workout_exercise.id,
                    set_number=set_number,
                    weight=planned_exercise.target_weight or 0,
                    reps=planned_exercise.target_reps or 1,
                    completed=False,
                )
            )

    db.commit()
    db.refresh(session)
    return get_session_for_athlete(db, session.id)


def add_exercise(db: Session, session_id: int, exercise_id: int) -> models.WorkoutExercise:
    session = get_session_for_athlete(db, session_id)
    if session.status != models.WorkoutStatus.IN_PROGRESS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Można edytować tylko sesje w trakcie")

    exercise = db.get(models.Exercise, exercise_id)
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nie znaleziono ćwiczenia")

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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nie znaleziono ćwiczenia w treningu")
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nie znaleziono ćwiczenia w treningu")

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


def update_set(db: Session, workout_set_id: int, payload: UpdateSetRequest) -> models.WorkoutSet:
    workout_set = db.scalar(
        select(models.WorkoutSet)
        .join(models.WorkoutExercise)
        .join(models.WorkoutSession)
        .where(
            models.WorkoutSet.id == workout_set_id,
            models.WorkoutSession.athlete_id == current_athlete_id(),
            models.WorkoutSession.status == models.WorkoutStatus.IN_PROGRESS,
        )
    )
    if workout_set is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nie znaleziono serii treningowej")

    if payload.weight is not None:
        workout_set.weight = payload.weight
    if payload.reps is not None:
        workout_set.reps = payload.reps
    if payload.rest_seconds is not None:
        workout_set.rest_seconds = payload.rest_seconds
    if payload.rpe is not None:
        workout_set.rpe = payload.rpe
    if payload.completed is not None:
        workout_set.completed = payload.completed

    db.commit()
    db.refresh(workout_set)
    return workout_set


def complete_session(db: Session, session_id: int) -> WorkoutSummary:
    session = get_session_for_athlete(db, session_id)
    completed_sets = [workout_set for exercise in session.exercises for workout_set in exercise.sets if workout_set.completed]
    if not session.exercises or not completed_sets:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ukończony trening musi zawierać co najmniej jedno ćwiczenie i jedną ukończoną serię",
        )

    session.status = models.WorkoutStatus.COMPLETED
    session.completed_at = datetime.now(UTC)
    db.commit()
    session = get_session_for_athlete(db, session_id)
    return workout_summary(session)


def workout_summary(session: models.WorkoutSession) -> WorkoutSummary:
    completed_sets = [workout_set for exercise in session.exercises for workout_set in exercise.sets if workout_set.completed]
    tonnage = sum(workout_set.weight * workout_set.reps for workout_set in completed_sets)
    return WorkoutSummary(
        session=session,
        tonnage=tonnage,
        completed_sets=len(completed_sets),
        duration_seconds=session_duration_seconds(session),
    )


def session_duration_seconds(session: models.WorkoutSession) -> int | None:
    if session.completed_at is None:
        return None
    return max(0, int((session.completed_at - session.started_at).total_seconds()))


def workout_history(db: Session) -> list[WorkoutHistoryItem]:
    sessions = list(
        db.scalars(
            select(models.WorkoutSession)
            .where(
                models.WorkoutSession.athlete_id == current_athlete_id(),
                models.WorkoutSession.status == models.WorkoutStatus.COMPLETED,
            )
            .order_by(models.WorkoutSession.completed_at.desc())
            .options(
                selectinload(models.WorkoutSession.exercises).selectinload(models.WorkoutExercise.sets),
                selectinload(models.WorkoutSession.exercises).selectinload(models.WorkoutExercise.exercise),
            )
        ).all()
    )

    planned_session_names = {
        planned_session.id: planned_session.name
        for planned_session in db.scalars(select(models.PlannedSession)).all()
    }

    items: list[WorkoutHistoryItem] = []
    for session in sessions:
        summary = workout_summary(session)
        items.append(
            WorkoutHistoryItem(
                id=session.id,
                plan_id=session.plan_id,
                planned_session_id=session.planned_session_id,
                session_name=planned_session_names.get(session.planned_session_id or 0, session.notes or "Ukończony trening"),
                status=session.status,
                started_at=session.started_at,
                completed_at=session.completed_at,
                completed_sets=summary.completed_sets,
                tonnage=summary.tonnage,
                duration_seconds=summary.duration_seconds,
            )
        )
    return items


def smart_autofill(db: Session, exercise_id: int) -> SmartAutofillRead:
    workout_exercise = db.scalar(
        select(models.WorkoutExercise)
        .join(models.WorkoutSession)
        .join(models.WorkoutSet, models.WorkoutSet.workout_exercise_id == models.WorkoutExercise.id)
        .where(
            models.WorkoutSession.athlete_id == current_athlete_id(),
            models.WorkoutSession.status == models.WorkoutStatus.COMPLETED,
            models.WorkoutExercise.exercise_id == exercise_id,
            models.WorkoutSet.completed.is_(True),
        )
        .order_by(models.WorkoutSession.completed_at.desc(), models.WorkoutExercise.id.desc())
        .limit(1)
        .options(
            selectinload(models.WorkoutExercise.sets),
            selectinload(models.WorkoutExercise.session),
        )
    )
    if workout_exercise is None:
        return SmartAutofillRead(exercise_id=exercise_id)

    completed_sets = [workout_set for workout_set in workout_exercise.sets if workout_set.completed]
    if not completed_sets:
        return SmartAutofillRead(exercise_id=exercise_id)

    first_set = completed_sets[0]
    session = workout_exercise.session
    return SmartAutofillRead(
        exercise_id=exercise_id,
        suggested_weight=first_set.weight,
        suggested_reps=first_set.reps,
        source_session_id=session.id,
        source_date=session.completed_at,
        suggested_sets=[
            SmartAutofillSetRead(
                set_number=workout_set.set_number,
                suggested_weight=workout_set.weight,
                suggested_reps=workout_set.reps,
            )
            for workout_set in completed_sets
        ],
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
        achievements.append("Pierwszy ukończony trening")
    if completed_workouts >= 10:
        achievements.append("10 ukończonych treningów")
    if total_tonnage >= 10000:
        achievements.append("10 000 kg objętości treningowej")

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
