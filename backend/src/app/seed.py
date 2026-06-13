from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Exercise, User, UserRole


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
