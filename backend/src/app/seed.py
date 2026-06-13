from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Exercise, PlannedExercise, PlannedSession, User, UserRole, WorkoutPlan


EXERCISES = [
    ("Bench Press", "Strength", "Chest", "https://exrx.net/WeightExercises/PectoralSternal/BBBenchPress"),
    ("Back Squat", "Strength", "Legs", "https://exrx.net/WeightExercises/Quadriceps/BBSquat"),
    ("Deadlift", "Strength", "Posterior chain", "https://exrx.net/WeightExercises/ErectorSpinae/BBDeadlift"),
    ("Overhead Press", "Strength", "Shoulders", "https://exrx.net/WeightExercises/DeltoidAnterior/BBMilitaryPress"),
    ("Pull-up", "Strength", "Back", "https://exrx.net/WeightExercises/LatissimusDorsi/BWPullup"),
    ("Barbell Row", "Strength", "Back", "https://exrx.net/WeightExercises/BackGeneral/BBBentOverRow"),
]


def seed_demo_data(db: Session) -> None:
    athlete = db.get(User, 1)
    if athlete is None:
        db.add(User(id=1, email="athlete@hipertrof.local", name="Demo Athlete", role=UserRole.ATHLETE))

    existing = set(db.scalars(select(Exercise.name)).all())
    for name, category, muscle_group, technique_url in EXERCISES:
        if name not in existing:
            db.add(
                Exercise(
                    name=name,
                    category=category,
                    muscle_group=muscle_group,
                    technique_url=technique_url,
                )
            )
    db.commit()

    exercise_by_name = {exercise.name: exercise for exercise in db.scalars(select(Exercise)).all()}
    existing_plan = db.scalar(select(WorkoutPlan).where(WorkoutPlan.name == "Hypertrophy Base Split"))
    if existing_plan is not None:
        return

    plan = WorkoutPlan(
        owner_id=1,
        assigned_athlete_id=1,
        name="Hypertrophy Base Split",
        description="Simple three-day split with clear target sets, reps, and starting weights.",
    )
    db.add(plan)
    db.flush()

    plan_sessions = [
        (
            "Leg Day",
            1,
            [
                ("Back Squat", 4, 8, 90.0, "Controlled descent, strong brace."),
                ("Deadlift", 3, 5, 120.0, "Leave one rep in reserve."),
            ],
        ),
        (
            "Chest Day",
            2,
            [
                ("Bench Press", 4, 8, 75.0, "Pause the first rep of each set."),
                ("Overhead Press", 3, 8, 42.5, "Keep ribs down."),
            ],
        ),
        (
            "Arm Day",
            3,
            [
                ("Pull-up", 4, 8, 0.0, "Use bodyweight or assistance as needed."),
                ("Barbell Row", 3, 10, 65.0, "Drive elbows back."),
            ],
        ),
    ]

    for session_name, order_index, planned_exercises in plan_sessions:
        planned_session = PlannedSession(plan_id=plan.id, name=session_name, order_index=order_index)
        db.add(planned_session)
        db.flush()

        for exercise_name, target_sets, target_reps, target_weight, notes in planned_exercises:
            db.add(
                PlannedExercise(
                    planned_session_id=planned_session.id,
                    exercise_id=exercise_by_name[exercise_name].id,
                    target_sets=target_sets,
                    target_reps=target_reps,
                    target_weight=target_weight,
                    notes=notes,
                )
            )
    db.commit()
