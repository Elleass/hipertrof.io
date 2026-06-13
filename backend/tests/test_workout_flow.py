import os

os.environ["DATABASE_URL"] = "sqlite:///./test_hipertrof.db"

from fastapi.testclient import TestClient

from app import models
from app.database import Base, SessionLocal, engine
from app.main import app
from app.seed import seed_demo_data


client = TestClient(app)


def setup_function():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_demo_data(db)


def start_workout_with_first_exercise():
    session = client.post("/workout-sessions/start", json={"notes": "Test workout"}).json()
    exercise = client.get("/exercises").json()[0]
    workout_exercise = client.post(
        f"/workout-sessions/{session['id']}/exercises",
        json={"exercise_id": exercise["id"]},
    ).json()
    return session, exercise, workout_exercise


def first_plan_and_session():
    plan = client.get("/plans").json()[0]
    planned_session = plan["sessions"][0]
    return plan, planned_session


def start_first_planned_session():
    plan, planned_session = first_plan_and_session()
    session = client.post(
        "/workout-sessions/start",
        json={"notes": planned_session["name"], "plan_id": plan["id"], "planned_session_id": planned_session["id"]},
    ).json()
    return plan, planned_session, session


def test_complete_workout_without_sets_is_rejected():
    session = client.post("/workout-sessions/start", json={"notes": "Empty workout"}).json()

    response = client.post(f"/workout-sessions/{session['id']}/complete")

    assert response.status_code == 400
    assert "at least one exercise" in response.json()["detail"]


def test_start_planned_session_creates_planned_sets():
    _, planned_session, session = start_first_planned_session()

    assert session["status"] == "IN_PROGRESS"
    assert len(session["exercises"]) == len(planned_session["exercises"])

    for workout_exercise, planned_exercise in zip(session["exercises"], planned_session["exercises"], strict=True):
        assert len(workout_exercise["sets"]) == planned_exercise["target_sets"]
        for index, workout_set in enumerate(workout_exercise["sets"], start=1):
            assert workout_set["set_number"] == index
            assert workout_set["weight"] == planned_exercise["target_weight"]
            assert workout_set["reps"] == planned_exercise["target_reps"]
            assert workout_set["completed"] is False


def test_start_planned_session_reuses_active_session():
    _, planned_session, session = start_first_planned_session()

    active = client.get(f"/workout-sessions/active?planned_session_id={planned_session['id']}").json()
    second_start = client.post(
        "/workout-sessions/start",
        json={"planned_session_id": planned_session["id"]},
    ).json()

    assert active["id"] == session["id"]
    assert second_start["id"] == session["id"]


def test_active_session_restores_missing_planned_sets():
    plan, planned_session = first_plan_and_session()
    planned_exercise = planned_session["exercises"][0]
    with SessionLocal() as db:
        legacy_session = models.WorkoutSession(
            athlete_id=1,
            plan_id=plan["id"],
            planned_session_id=planned_session["id"],
            status=models.WorkoutStatus.IN_PROGRESS,
            notes="Legacy active workout",
        )
        db.add(legacy_session)
        db.flush()
        legacy_session_id = legacy_session.id
        db.add(
            models.WorkoutExercise(
                workout_session_id=legacy_session.id,
                exercise_id=planned_exercise["exercise"]["id"],
                order_index=1,
            )
        )
        db.commit()

    active = client.get(f"/workout-sessions/active?planned_session_id={planned_session['id']}").json()

    assert active["id"] == legacy_session_id
    assert len(active["exercises"][0]["sets"]) == planned_exercise["target_sets"]
    assert active["exercises"][0]["sets"][0]["completed"] is False


def test_add_and_update_set():
    _, _, workout_exercise = start_workout_with_first_exercise()

    created = client.post(
        f"/workout-exercises/{workout_exercise['id']}/sets",
        json={"weight": 80, "reps": 8, "completed": True},
    ).json()
    updated = client.patch(
        f"/workout-sets/{created['id']}",
        json={"weight": 82.5, "reps": 9, "completed": True},
    ).json()

    assert updated["weight"] == 82.5
    assert updated["reps"] == 9
    assert updated["completed"] is True


def test_complete_updates_the_requested_set_number():
    _, _, session = start_first_planned_session()
    workout_exercise = session["exercises"][0]
    third_set = workout_exercise["sets"][2]

    updated = client.patch(
        f"/workout-sets/{third_set['id']}",
        json={"weight": 95, "reps": 7, "completed": True},
    ).json()
    refreshed = client.get(f"/workout-sessions/{session['id']}").json()
    sets = refreshed["exercises"][0]["sets"]

    assert updated["set_number"] == 3
    assert sets[2]["id"] == third_set["id"]
    assert sets[2]["completed"] is True
    assert sets[2]["weight"] == 95
    assert sets[2]["reps"] == 7
    assert sets[0]["completed"] is False
    assert sets[1]["completed"] is False


def test_tonnage_summary_uses_completed_sets():
    session, _, workout_exercise = start_workout_with_first_exercise()
    client.post(
        f"/workout-exercises/{workout_exercise['id']}/sets",
        json={"weight": 100, "reps": 5, "completed": True},
    )

    summary = client.post(f"/workout-sessions/{session['id']}/complete").json()

    assert summary["completed_sets"] == 1
    assert summary["tonnage"] == 500
    assert summary["session"]["status"] == "COMPLETED"


def test_smart_autofill_returns_previous_values_per_set():
    _, _, session = start_first_planned_session()
    workout_exercise = session["exercises"][0]
    exercise = workout_exercise["exercise"]

    client.patch(
        f"/workout-sets/{workout_exercise['sets'][0]['id']}",
        json={"weight": 90, "reps": 8, "completed": True},
    )
    client.patch(
        f"/workout-sets/{workout_exercise['sets'][1]['id']}",
        json={"weight": 92.5, "reps": 7, "completed": True},
    )
    client.post(f"/workout-sessions/{session['id']}/complete")

    suggestion = client.get(f"/smart-autofill?exercise_id={exercise['id']}").json()

    assert suggestion["suggested_weight"] == 90
    assert suggestion["suggested_reps"] == 8
    assert suggestion["suggested_sets"][0] == {"set_number": 1, "suggested_weight": 90, "suggested_reps": 8}
    assert suggestion["suggested_sets"][1] == {"set_number": 2, "suggested_weight": 92.5, "suggested_reps": 7}


def test_completed_workout_sets_cannot_be_edited():
    session, _, workout_exercise = start_workout_with_first_exercise()
    workout_set = client.post(
        f"/workout-exercises/{workout_exercise['id']}/sets",
        json={"weight": 60, "reps": 10, "completed": True},
    ).json()
    client.post(f"/workout-sessions/{session['id']}/complete")

    response = client.patch(
        f"/workout-sets/{workout_set['id']}",
        json={"weight": 65, "reps": 10, "completed": True},
    )

    assert response.status_code == 404


def test_history_lists_completed_workouts():
    session, _, workout_exercise = start_workout_with_first_exercise()
    client.post(
        f"/workout-exercises/{workout_exercise['id']}/sets",
        json={"weight": 60, "reps": 10, "completed": True},
    )
    client.post(f"/workout-sessions/{session['id']}/complete")

    history = client.get("/history").json()

    assert len(history) == 1
    assert history[0]["status"] == "COMPLETED"
    assert history[0]["completed_sets"] == 1

    detail = client.get(f"/history/{session['id']}").json()

    assert detail["status"] == "COMPLETED"
    assert detail["exercises"][0]["sets"][0]["weight"] == 60
    assert detail["exercises"][0]["sets"][0]["reps"] == 10
    assert detail["exercises"][0]["sets"][0]["completed"] is True
