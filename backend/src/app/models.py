from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(StrEnum):
    ATHLETE = "ATHLETE"
    COACH = "COACH"


class RelationStatus(StrEnum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class WorkoutStatus(StrEnum):
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    MISSED = "MISSED"


class SurveyRecommendation(StrEnum):
    LIGHT = "LIGHT"
    NORMAL = "NORMAL"
    HEAVY = "HEAVY"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), default="demo-only")
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.ATHLETE)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CoachAthleteRelation(Base):
    __tablename__ = "coach_athlete_relations"

    id: Mapped[int] = mapped_column(primary_key=True)
    coach_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    athlete_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    status: Mapped[RelationStatus] = mapped_column(Enum(RelationStatus), default=RelationStatus.PENDING)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    category: Mapped[str] = mapped_column(String(80))
    muscle_group: Mapped[str] = mapped_column(String(80))
    technique_url: Mapped[str | None] = mapped_column(String(500), nullable=True)


class WorkoutPlan(Base):
    __tablename__ = "workout_plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    assigned_athlete_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PlannedSession(Base):
    __tablename__ = "planned_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("workout_plans.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(160))
    scheduled_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)


class PlannedExercise(Base):
    __tablename__ = "planned_exercises"

    id: Mapped[int] = mapped_column(primary_key=True)
    planned_session_id: Mapped[int] = mapped_column(ForeignKey("planned_sessions.id", ondelete="CASCADE"))
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id"))
    target_sets: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_reps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    athlete_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    plan_id: Mapped[int | None] = mapped_column(ForeignKey("workout_plans.id"), nullable=True)
    planned_session_id: Mapped[int | None] = mapped_column(ForeignKey("planned_sessions.id"), nullable=True)
    status: Mapped[WorkoutStatus] = mapped_column(Enum(WorkoutStatus), default=WorkoutStatus.IN_PROGRESS)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    exercises: Mapped[list["WorkoutExercise"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="WorkoutExercise.order_index",
    )

    __table_args__ = (
        Index("ix_workout_sessions_athlete_status_completed", "athlete_id", "status", "completed_at"),
    )


class WorkoutExercise(Base):
    __tablename__ = "workout_exercises"

    id: Mapped[int] = mapped_column(primary_key=True)
    workout_session_id: Mapped[int] = mapped_column(ForeignKey("workout_sessions.id", ondelete="CASCADE"))
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id"), index=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    exercise: Mapped[Exercise] = relationship()
    session: Mapped[WorkoutSession] = relationship(back_populates="exercises")
    sets: Mapped[list["WorkoutSet"]] = relationship(
        back_populates="workout_exercise",
        cascade="all, delete-orphan",
        order_by="WorkoutSet.set_number",
    )


class WorkoutSet(Base):
    __tablename__ = "workout_sets"

    id: Mapped[int] = mapped_column(primary_key=True)
    workout_exercise_id: Mapped[int] = mapped_column(ForeignKey("workout_exercises.id", ondelete="CASCADE"), index=True)
    set_number: Mapped[int] = mapped_column(Integer)
    weight: Mapped[float] = mapped_column(Float)
    reps: Mapped[int] = mapped_column(Integer)
    rest_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rpe: Mapped[float | None] = mapped_column(Float, nullable=True)
    completed: Mapped[bool] = mapped_column(default=True)

    workout_exercise: Mapped[WorkoutExercise] = relationship(back_populates="sets")


class PreWorkoutSurvey(Base):
    __tablename__ = "pre_workout_surveys"

    id: Mapped[int] = mapped_column(primary_key=True)
    workout_session_id: Mapped[int] = mapped_column(ForeignKey("workout_sessions.id", ondelete="CASCADE"))
    sleep_quality: Mapped[int] = mapped_column(Integer)
    fatigue_level: Mapped[int] = mapped_column(Integer)
    soreness_level: Mapped[int] = mapped_column(Integer)
    motivation_level: Mapped[int] = mapped_column(Integer)
    recommendation: Mapped[SurveyRecommendation] = mapped_column(Enum(SurveyRecommendation))


class ExternalActivity(Base):
    __tablename__ = "external_activities"

    id: Mapped[int] = mapped_column(primary_key=True)
    athlete_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    source: Mapped[str] = mapped_column(String(80))
    activity_type: Mapped[str] = mapped_column(String(80))
    distance: Mapped[float | None] = mapped_column(Float, nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    load_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    activity_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Achievement(Base):
    __tablename__ = "achievements"

    id: Mapped[int] = mapped_column(primary_key=True)
    athlete_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    type: Mapped[str] = mapped_column(String(80))
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text)
    unlocked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
