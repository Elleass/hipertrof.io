from datetime import datetime

from pydantic import BaseModel, Field

from app.models import SurveyRecommendation, WorkoutStatus


class ExerciseRead(BaseModel):
    id: int
    name: str
    category: str
    muscle_group: str
    technique_url: str | None = None

    model_config = {"from_attributes": True}


class PlannedExerciseRead(BaseModel):
    id: int
    exercise: ExerciseRead
    target_sets: int | None = None
    target_reps: int | None = None
    target_weight: float | None = None
    notes: str | None = None

    model_config = {"from_attributes": True}


class PlannedSessionRead(BaseModel):
    id: int
    name: str
    scheduled_date: datetime | None = None
    order_index: int
    exercises: list[PlannedExerciseRead] = []

    model_config = {"from_attributes": True}


class WorkoutPlanRead(BaseModel):
    id: int
    name: str
    description: str | None = None
    created_at: datetime
    sessions: list[PlannedSessionRead] = []

    model_config = {"from_attributes": True}


class StartWorkoutRequest(BaseModel):
    notes: str | None = None
    plan_id: int | None = None
    planned_session_id: int | None = None


class AddExerciseRequest(BaseModel):
    exercise_id: int


class AddSetRequest(BaseModel):
    weight: float = Field(ge=0)
    reps: int = Field(ge=1)
    rest_seconds: int | None = Field(default=None, ge=0)
    rpe: float | None = Field(default=None, ge=1, le=10)
    completed: bool = True


class UpdateSetRequest(BaseModel):
    weight: float | None = Field(default=None, ge=0)
    reps: int | None = Field(default=None, ge=1)
    rest_seconds: int | None = Field(default=None, ge=0)
    rpe: float | None = Field(default=None, ge=1, le=10)
    completed: bool | None = None


class WorkoutSetRead(BaseModel):
    id: int
    set_number: int
    weight: float
    reps: int
    rest_seconds: int | None = None
    rpe: float | None = None
    completed: bool

    model_config = {"from_attributes": True}


class WorkoutExerciseRead(BaseModel):
    id: int
    order_index: int
    exercise: ExerciseRead
    sets: list[WorkoutSetRead] = []

    model_config = {"from_attributes": True}


class WorkoutSessionRead(BaseModel):
    id: int
    plan_id: int | None = None
    planned_session_id: int | None = None
    status: WorkoutStatus
    started_at: datetime
    completed_at: datetime | None = None
    notes: str | None = None
    exercises: list[WorkoutExerciseRead] = []

    model_config = {"from_attributes": True}


class WorkoutSummary(BaseModel):
    session: WorkoutSessionRead
    tonnage: float
    completed_sets: int


class SmartAutofillRead(BaseModel):
    exercise_id: int
    suggested_weight: float | None = None
    suggested_reps: int | None = None
    source_session_id: int | None = None
    source_date: datetime | None = None


class StatisticsSummary(BaseModel):
    completed_workouts: int
    total_tonnage: float
    personal_records: dict[str, float]
    achievements: list[str]


class SurveyRequest(BaseModel):
    sleep_quality: int = Field(ge=1, le=5)
    fatigue_level: int = Field(ge=1, le=5)
    soreness_level: int = Field(ge=1, le=5)
    motivation_level: int = Field(ge=1, le=5)


class SurveyRead(BaseModel):
    id: int
    workout_session_id: int
    recommendation: SurveyRecommendation

    model_config = {"from_attributes": True}
