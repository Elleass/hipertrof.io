import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { api, Exercise, SmartAutofill, StatisticsSummary, WorkoutExercise, WorkoutSession, WorkoutSummary } from "./api";
import "./styles.css";

type SetDraft = {
  weight: string;
  reps: string;
  rpe: string;
};

const emptyDraft: SetDraft = { weight: "", reps: "", rpe: "" };

function App() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [stats, setStats] = useState<StatisticsSummary | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [selectedWorkoutExerciseId, setSelectedWorkoutExerciseId] = useState<number | null>(null);
  const [suggestion, setSuggestion] = useState<SmartAutofill | null>(null);
  const [draft, setDraft] = useState<SetDraft>(emptyDraft);
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeExercise = useMemo(
    () => session?.exercises.find((item) => item.id === selectedWorkoutExerciseId) ?? null,
    [session, selectedWorkoutExerciseId],
  );

  const tonnage = useMemo(() => {
    if (!session) return 0;
    return session.exercises.reduce((total, item) => {
      return total + item.sets.reduce((exerciseTotal, set) => exerciseTotal + set.weight * set.reps, 0);
    }, 0);
  }, [session]);

  async function loadInitialData() {
    setError(null);
    try {
      const [exerciseList, summaryStats] = await Promise.all([api.exercises(), api.stats()]);
      setExercises(exerciseList);
      setStats(summaryStats);
      setSelectedExerciseId(exerciseList[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load application data");
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  async function refreshSession(sessionId: number) {
    const updated = await api.getWorkout(sessionId);
    setSession(updated);
    return updated;
  }

  async function startWorkout() {
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const nextSession = await api.startWorkout();
      setSession(nextSession);
      setSelectedWorkoutExerciseId(null);
      setSuggestion(null);
      setDraft(emptyDraft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start workout");
    } finally {
      setLoading(false);
    }
  }

  async function addExerciseToSession() {
    if (!session || selectedExerciseId === null) return;
    setLoading(true);
    setError(null);
    try {
      const workoutExercise = await api.addExercise(session.id, selectedExerciseId);
      const smart = await api.smartAutofill(selectedExerciseId);
      const updated = await refreshSession(session.id);
      setSelectedWorkoutExerciseId(workoutExercise.id);
      setSuggestion(smart);
      setDraft({
        weight: smart.suggested_weight?.toString() ?? "",
        reps: smart.suggested_reps?.toString() ?? "",
        rpe: "",
      });
      if (!updated.exercises.some((item) => item.id === workoutExercise.id)) {
        setSession({ ...updated, exercises: [...updated.exercises, workoutExercise] });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add exercise");
    } finally {
      setLoading(false);
    }
  }

  async function saveSet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedWorkoutExerciseId === null || !session) return;

    const weight = Number(draft.weight);
    const reps = Number(draft.reps);
    const rpe = draft.rpe ? Number(draft.rpe) : null;
    if (!Number.isFinite(weight) || !Number.isFinite(reps) || reps < 1) {
      setError("Enter a valid weight and reps count");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.addSet(selectedWorkoutExerciseId, { weight, reps, rpe });
      await refreshSession(session.id);
      setDraft({ weight: draft.weight, reps: draft.reps, rpe: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save set");
    } finally {
      setLoading(false);
    }
  }

  async function completeWorkout() {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const completed = await api.completeWorkout(session.id);
      setSummary(completed);
      setSession(completed.session);
      setStats(await api.stats());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete workout");
    } finally {
      setLoading(false);
    }
  }

  function useSuggestion() {
    if (suggestion?.suggested_weight == null || suggestion.suggested_reps == null) return;
    setDraft({
      weight: suggestion.suggested_weight.toString(),
      reps: suggestion.suggested_reps.toString(),
      rpe: draft.rpe,
    });
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Hipertrof.io</p>
          <h1>Workout diary</h1>
        </div>
        <button type="button" onClick={startWorkout} disabled={loading || session?.status === "IN_PROGRESS"}>
          Start workout
        </button>
      </header>

      {error && <div className="notice error">{error}</div>}

      <section className="dashboard-grid">
        <div className="metric">
          <span>Completed</span>
          <strong>{stats?.completed_workouts ?? 0}</strong>
        </div>
        <div className="metric">
          <span>Total tonnage</span>
          <strong>{Math.round(stats?.total_tonnage ?? 0)} kg</strong>
        </div>
        <div className="metric">
          <span>Current tonnage</span>
          <strong>{Math.round(tonnage)} kg</strong>
        </div>
      </section>

      <section className="workspace">
        <div className="workout-column">
          <div className="section-heading">
            <h2>Active workout</h2>
            {session && <span className={`status status-${session.status.toLowerCase()}`}>{session.status}</span>}
          </div>

          {!session && <div className="empty-state">Start a workout to log your first exercise.</div>}

          {session && (
            <>
              <div className="exercise-picker">
                <select
                  value={selectedExerciseId ?? ""}
                  onChange={(event) => setSelectedExerciseId(Number(event.target.value))}
                  disabled={session.status !== "IN_PROGRESS"}
                >
                  {exercises.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={addExerciseToSession} disabled={loading || session.status !== "IN_PROGRESS"}>
                  Add exercise
                </button>
              </div>

              <div className="exercise-list">
                {session.exercises.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={item.id === selectedWorkoutExerciseId ? "exercise-row selected" : "exercise-row"}
                    onClick={() => setSelectedWorkoutExerciseId(item.id)}
                  >
                    <span>{item.exercise.name}</span>
                    <small>
                      {item.sets.length} sets · {item.exercise.muscle_group}
                    </small>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="logger-column">
          <div className="section-heading">
            <h2>{activeExercise?.exercise.name ?? "Set logger"}</h2>
            {activeExercise && <span>{activeExercise.sets.length} sets</span>}
          </div>

          {!activeExercise && <div className="empty-state">Choose an exercise to add working sets.</div>}

          {activeExercise && (
            <>
              {suggestion?.suggested_weight && suggestion.suggested_reps ? (
                <div className="notice suggestion">
                  <span>
                    Last time: {suggestion.suggested_weight} kg x {suggestion.suggested_reps}
                  </span>
                  <button type="button" onClick={useSuggestion}>
                    Use
                  </button>
                </div>
              ) : (
                <div className="notice">No previous data for this exercise yet.</div>
              )}

              <form className="set-form" onSubmit={saveSet}>
                <label>
                  <span>Weight</span>
                  <input
                    inputMode="decimal"
                    value={draft.weight}
                    onChange={(event) => setDraft({ ...draft, weight: event.target.value })}
                    placeholder="80"
                  />
                </label>
                <label>
                  <span>Reps</span>
                  <input
                    inputMode="numeric"
                    value={draft.reps}
                    onChange={(event) => setDraft({ ...draft, reps: event.target.value })}
                    placeholder="10"
                  />
                </label>
                <label>
                  <span>RPE</span>
                  <input
                    inputMode="decimal"
                    value={draft.rpe}
                    onChange={(event) => setDraft({ ...draft, rpe: event.target.value })}
                    placeholder="8"
                  />
                </label>
                <button type="submit" disabled={loading || session?.status !== "IN_PROGRESS"}>
                  Save set
                </button>
              </form>

              <div className="set-list">
                {activeExercise.sets.map((set) => (
                  <div key={set.id} className="set-row">
                    <span>Set {set.set_number}</span>
                    <strong>
                      {set.weight} kg x {set.reps}
                    </strong>
                    <small>{set.rpe ? `RPE ${set.rpe}` : "RPE -"}</small>
                  </div>
                ))}
              </div>
            </>
          )}

          {session?.status === "IN_PROGRESS" && (
            <button type="button" className="complete-button" onClick={completeWorkout} disabled={loading}>
              Finish workout
            </button>
          )}
        </div>
      </section>

      {summary && (
        <section className="summary-band">
          <h2>Workout summary</h2>
          <div>
            <span>{summary.completed_sets} completed sets</span>
            <strong>{Math.round(summary.tonnage)} kg tonnage</strong>
          </div>
        </section>
      )}

      <section className="records">
        <div>
          <h2>Personal records</h2>
          {Object.entries(stats?.personal_records ?? {}).length === 0 ? (
            <p>No completed sets yet.</p>
          ) : (
            Object.entries(stats?.personal_records ?? {}).map(([name, weight]) => (
              <div key={name} className="record-row">
                <span>{name}</span>
                <strong>{weight} kg</strong>
              </div>
            ))
          )}
        </div>
        <div>
          <h2>Achievements</h2>
          {(stats?.achievements.length ?? 0) === 0 ? (
            <p>No badges yet.</p>
          ) : (
            stats?.achievements.map((achievement) => (
              <div key={achievement} className="badge-row">
                {achievement}
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
