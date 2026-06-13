from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app import models
from app.database import get_db
from app.schemas import WorkoutPlanRead
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Training plan not found")
    return plan
