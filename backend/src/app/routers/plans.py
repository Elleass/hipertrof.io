from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app import models
from app.database import get_db
from app.schemas import PlannedExerciseRead, PlannedExerciseUpdateRequest, WorkoutPlanRead
from app.services.workouts import current_athlete_id

router = APIRouter(prefix="/plans", tags=["plans"])


def plan_options():
    return (
        selectinload(models.WorkoutPlan.sessions)
        .selectinload(models.PlannedSession.exercises)
        .selectinload(models.PlannedExercise.exercise)
    )


@router.get("", response_model=list[WorkoutPlanRead])
def list_plans(db: Session = Depends(get_db)) -> list[models.WorkoutPlan]:
    return list(
        db.scalars(
            select(models.WorkoutPlan)
            .where(
                (models.WorkoutPlan.owner_id == current_athlete_id())
                | (models.WorkoutPlan.assigned_athlete_id == current_athlete_id())
            )
            .order_by(models.WorkoutPlan.created_at.desc())
            .options(plan_options())
        ).unique().all()
    )


@router.get("/{plan_id}", response_model=WorkoutPlanRead)
def get_plan(plan_id: int, db: Session = Depends(get_db)) -> models.WorkoutPlan:
    plan = db.scalar(
        select(models.WorkoutPlan)
        .where(
            models.WorkoutPlan.id == plan_id,
            (
                (models.WorkoutPlan.owner_id == current_athlete_id())
                | (models.WorkoutPlan.assigned_athlete_id == current_athlete_id())
            ),
        )
        .options(plan_options())
    )
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nie znaleziono planu treningowego")
    return plan


@router.patch("/planned-exercises/{planned_exercise_id}", response_model=PlannedExerciseRead)
def update_planned_exercise(
    planned_exercise_id: int,
    payload: PlannedExerciseUpdateRequest,
    db: Session = Depends(get_db),
) -> models.PlannedExercise:
    planned_exercise = db.scalar(
        select(models.PlannedExercise)
        .join(models.PlannedSession)
        .join(models.WorkoutPlan)
        .where(
            models.PlannedExercise.id == planned_exercise_id,
            (
                (models.WorkoutPlan.owner_id == current_athlete_id())
                | (models.WorkoutPlan.assigned_athlete_id == current_athlete_id())
            ),
        )
        .options(selectinload(models.PlannedExercise.exercise))
    )
    if planned_exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nie znaleziono zaplanowanego ćwiczenia")

    if payload.target_sets is not None:
        planned_exercise.target_sets = payload.target_sets
    if payload.target_reps is not None:
        planned_exercise.target_reps = payload.target_reps
    if payload.target_weight is not None:
        planned_exercise.target_weight = payload.target_weight
    if payload.notes is not None:
        planned_exercise.notes = payload.notes

    db.commit()
    db.refresh(planned_exercise)
    return planned_exercise
