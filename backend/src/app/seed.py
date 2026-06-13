from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Exercise, PlannedExercise, PlannedSession, User, UserRole, WorkoutPlan


EXERCISES = [
    ("Wyciskanie leżąc", "Siła", "Klatka piersiowa", "https://exrx.net/WeightExercises/PectoralSternal/BBBenchPress"),
    ("Przysiad ze sztangą", "Siła", "Nogi", "https://exrx.net/WeightExercises/Quadriceps/BBSquat"),
    ("Martwy ciąg", "Siła", "Tylny łańcuch", "https://exrx.net/WeightExercises/ErectorSpinae/BBDeadlift"),
    ("Wyciskanie nad głowę", "Siła", "Barki", "https://exrx.net/WeightExercises/DeltoidAnterior/BBMilitaryPress"),
    ("Podciąganie", "Siła", "Plecy", "https://exrx.net/WeightExercises/LatissimusDorsi/BWPullup"),
    ("Wiosłowanie sztangą", "Siła", "Plecy", "https://exrx.net/WeightExercises/BackGeneral/BBBentOverRow"),
]

OLD_EXERCISE_NAMES_BY_URL = {
    "https://exrx.net/WeightExercises/PectoralSternal/BBBenchPress": "Bench Press",
    "https://exrx.net/WeightExercises/Quadriceps/BBSquat": "Back Squat",
    "https://exrx.net/WeightExercises/ErectorSpinae/BBDeadlift": "Deadlift",
    "https://exrx.net/WeightExercises/DeltoidAnterior/BBMilitaryPress": "Overhead Press",
    "https://exrx.net/WeightExercises/LatissimusDorsi/BWPullup": "Pull-up",
    "https://exrx.net/WeightExercises/BackGeneral/BBBentOverRow": "Barbell Row",
}

PLAN_NAME = "Baza hipertrofii"
OLD_PLAN_NAME = "Hypertrophy Base Split"


def seed_demo_data(db: Session) -> None:
    athlete = db.get(User, 1)
    if athlete is None:
        db.add(User(id=1, email="athlete@hipertrof.local", name="Zawodnik demo", role=UserRole.ATHLETE))

    existing_by_name = {exercise.name: exercise for exercise in db.scalars(select(Exercise)).all()}
    existing_by_url = {
        exercise.technique_url: exercise
        for exercise in existing_by_name.values()
        if exercise.technique_url is not None
    }
    for name, category, muscle_group, technique_url in EXERCISES:
        exercise = existing_by_name.get(name) or existing_by_url.get(technique_url)
        if exercise is None:
            db.add(
                Exercise(
                    name=name,
                    category=category,
                    muscle_group=muscle_group,
                    technique_url=technique_url,
                )
            )
            continue

        exercise.name = name
        exercise.category = category
        exercise.muscle_group = muscle_group
        exercise.technique_url = technique_url
    db.commit()

    exercise_by_name = {exercise.name: exercise for exercise in db.scalars(select(Exercise)).all()}
    existing_plan = db.scalar(select(WorkoutPlan).where(WorkoutPlan.name.in_([PLAN_NAME, OLD_PLAN_NAME])))
    if existing_plan is not None:
        existing_plan.name = PLAN_NAME
        existing_plan.description = "Prosty trzydniowy split z jasnymi celami serii, powtórzeń i ciężaru startowego."
        update_existing_plan(existing_plan)
        db.commit()
        return

    plan = WorkoutPlan(
        owner_id=1,
        assigned_athlete_id=1,
        name=PLAN_NAME,
        description="Prosty trzydniowy split z jasnymi celami serii, powtórzeń i ciężaru startowego.",
    )
    db.add(plan)
    db.flush()

    plan_sessions = [
        (
            "Dzień nóg",
            1,
            [
                ("Przysiad ze sztangą", 4, 8, 90.0, "Kontrolowane zejście, mocne napięcie tułowia."),
                ("Martwy ciąg", 3, 5, 120.0, "Zostaw jedno powtórzenie w zapasie."),
            ],
        ),
        (
            "Dzień klatki",
            2,
            [
                ("Wyciskanie leżąc", 4, 8, 75.0, "Zatrzymaj pierwsze powtórzenie w każdej serii."),
                ("Wyciskanie nad głowę", 3, 8, 42.5, "Trzymaj żebra nisko."),
            ],
        ),
        (
            "Dzień pleców i ramion",
            3,
            [
                ("Podciąganie", 4, 8, 0.0, "Użyj masy ciała albo asysty, jeśli jej potrzebujesz."),
                ("Wiosłowanie sztangą", 3, 10, 65.0, "Prowadź łokcie mocno do tyłu."),
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


def update_existing_plan(plan: WorkoutPlan) -> None:
    session_names = {
        1: "Dzień nóg",
        2: "Dzień klatki",
        3: "Dzień pleców i ramion",
    }
    exercise_notes = {
        "Przysiad ze sztangą": "Kontrolowane zejście, mocne napięcie tułowia.",
        "Martwy ciąg": "Zostaw jedno powtórzenie w zapasie.",
        "Wyciskanie leżąc": "Zatrzymaj pierwsze powtórzenie w każdej serii.",
        "Wyciskanie nad głowę": "Trzymaj żebra nisko.",
        "Podciąganie": "Użyj masy ciała albo asysty, jeśli jej potrzebujesz.",
        "Wiosłowanie sztangą": "Prowadź łokcie mocno do tyłu.",
    }
    for session in plan.sessions:
        session.name = session_names.get(session.order_index, session.name)
        for planned_exercise in session.exercises:
            old_name = OLD_EXERCISE_NAMES_BY_URL.get(planned_exercise.exercise.technique_url or "")
            note = exercise_notes.get(planned_exercise.exercise.name) or exercise_notes.get(old_name or "")
            if note is not None:
                planned_exercise.notes = note
