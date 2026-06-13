import {
  Exercise,
  PlannedExercise,
  PlannedSession,
  SmartAutofill,
  WorkoutExercise,
  WorkoutPlan,
  WorkoutSet,
  WorkoutSession,
  WorkoutSummary,
} from "../api";
import { formatTimer, plannedSetCount, PlannedTotals, PreviousByExercise, SetDraft, SetEdit } from "../types";
import { Sidebar } from "./Sidebar";

type SessionDetailViewProps = {
  activeExercise: WorkoutExercise | null;
  activePlannedExercise: PlannedExercise | null;
  completedSetCount: number;
  draft: SetDraft;
  error: string | null;
  exercises: Exercise[];
  loading: boolean;
  plan: WorkoutPlan | null;
  plannedSession: PlannedSession | null;
  plannedTotals: PlannedTotals;
  previousByExercise: PreviousByExercise;
  progressPercent: number;
  restRemaining: number;
  selectedExerciseId: number | null;
  selectedWorkoutExerciseId: number | null;
  session: WorkoutSession | null;
  sessionElapsed: number;
  summary: WorkoutSummary | null;
  onAddExercise: () => void;
  onApplyPrevious: (item: WorkoutExercise) => void;
  onCompleteSet: (item: WorkoutExercise, index: number, existingSet: WorkoutSet | undefined, values: SetEdit) => void;
  onCompleteWorkout: () => void;
  onDraftChange: (draft: SetDraft) => void;
  onNavigateDashboard: () => void;
  onSaveManualSet: (event: React.FormEvent<HTMLFormElement>) => void;
  onSelectExercise: (exerciseId: number) => void;
  onSelectWorkoutExercise: (item: WorkoutExercise) => void;
  onSetEditChange: (workoutExerciseId: number, index: number, field: keyof SetEdit, value: string, currentValues: SetEdit) => void;
  onStartPlannedWorkout: (plan: WorkoutPlan, plannedSession: PlannedSession) => void;
  onStartSession: () => void;
  onUsePlannedTarget: (target: PlannedExercise) => void;
  onUseSuggestion: () => void;
  getSetValues: (item: WorkoutExercise, target: PlannedExercise | null, set: WorkoutSet | undefined, index: number) => SetEdit;
  getTargetForWorkoutExercise: (item: WorkoutExercise) => PlannedExercise | null;
  suggestion: SmartAutofill | null;
};

export function SessionDetailView({
  activeExercise,
  activePlannedExercise,
  completedSetCount,
  draft,
  error,
  exercises,
  loading,
  plan,
  plannedSession,
  plannedTotals,
  previousByExercise,
  progressPercent,
  restRemaining,
  selectedExerciseId,
  selectedWorkoutExerciseId,
  session,
  sessionElapsed,
  summary,
  onAddExercise,
  onApplyPrevious,
  onCompleteSet,
  onCompleteWorkout,
  onDraftChange,
  onNavigateDashboard,
  onSaveManualSet,
  onSelectExercise,
  onSelectWorkoutExercise,
  onSetEditChange,
  onStartPlannedWorkout,
  onStartSession,
  onUsePlannedTarget,
  onUseSuggestion,
  getSetValues,
  getTargetForWorkoutExercise,
  suggestion,
}: SessionDetailViewProps) {
  const plannedExercises = plannedSession?.exercises ?? [];

  return (
    <section className="app-frame session-frame">
      <Sidebar
        mode="session"
        loading={loading}
        session={session}
        onNavigateDashboard={onNavigateDashboard}
        onStartSession={onStartSession}
      />

      <section id="session-detail" className="session-content">
        <header className="session-header">
          <div>
            <p className="breadcrumb">
              Training Plans / {plan?.name ?? "Select Plan"} / {plannedSession?.name ?? "Session"}
            </p>
            <h2>{plannedSession?.name ?? "Choose a session"}</h2>
            <div className="session-tags">
              <span>{session?.status ?? "READY"}</span>
              <span>
                {completedSetCount}/{plannedTotals.sets} sets
              </span>
              <span>{formatTimer(sessionElapsed)}</span>
              <span>Rest {formatTimer(restRemaining)}</span>
            </div>
          </div>
          {session?.status === "IN_PROGRESS" && (
            <button className="primary-action finish-action" type="button" onClick={onCompleteWorkout} disabled={loading}>
              Finish Session
            </button>
          )}
        </header>

        <div className="progress-block">
          <div>
            <span>Workout progress</span>
            <strong>{progressPercent}%</strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {error && <div className="notice error">{error}</div>}

        {!plannedSession && <div className="empty-state dark-empty">This planned session was not found.</div>}

        {plannedSession && !session && (
          <>
            <div className="session-start-panel">
              <div>
                <strong>{plannedSession.name}</strong>
                <span>Review planned exercises and suggested values, then start the workout.</span>
              </div>
              {plan && (
                <button className="primary-action" type="button" onClick={() => onStartPlannedWorkout(plan, plannedSession)} disabled={loading}>
                  Start Session
                </button>
              )}
            </div>

            <div className="session-exercises">
              {plannedExercises.map((target) => (
                <article key={target.id} className="exercise-panel">
                  <div className="exercise-panel-header static-header">
                    <span>
                      <strong>{target.exercise.name}</strong>
                      <small>
                        Target: {target.target_sets ?? "-"} sets x {target.target_reps ?? "-"} reps @{" "}
                        {target.target_weight ?? "-"} kg
                      </small>
                    </span>
                    <span className="panel-menu">|</span>
                  </div>
                  <div className="planned-target-list">
                    <span>{target.notes}</span>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {session && (
          <>
            <div className="session-picker">
              <select
                value={selectedExerciseId ?? ""}
                onChange={(event) => onSelectExercise(Number(event.target.value))}
                disabled={session.status !== "IN_PROGRESS"}
              >
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </select>
              <button className="dark-action" type="button" onClick={onAddExercise} disabled={loading || session.status !== "IN_PROGRESS"}>
                Add Exercise
              </button>
            </div>

            <div className="session-exercises">
              {session.exercises.map((item) => {
                const target = getTargetForWorkoutExercise(item);
                const isSelected = selectedWorkoutExerciseId === item.id;
                const setRows = Array.from({ length: Math.max(plannedSetCount(target), item.sets.length) });

                return (
                  <article key={item.id} className={isSelected ? "exercise-panel selected" : "exercise-panel"}>
                    <button className="exercise-panel-header" type="button" onClick={() => onSelectWorkoutExercise(item)}>
                      <span>
                        <strong>{item.exercise.name}</strong>
                        <small>
                          Target: {target?.target_sets ?? "-"} sets x {target?.target_reps ?? "-"} reps @{" "}
                          {target?.target_weight ?? "-"} kg
                        </small>
                      </span>
                      <span className="panel-menu">|</span>
                    </button>

                    <div className="exercise-actions">
                      <button type="button" className="ghost-action" onClick={() => onApplyPrevious(item)}>
                        Use Previous Weight
                      </button>
                      {previousByExercise[item.exercise.id]?.suggested_weight != null && (
                        <span>
                          Previous: {previousByExercise[item.exercise.id].suggested_weight} kg x{" "}
                          {previousByExercise[item.exercise.id].suggested_reps}
                        </span>
                      )}
                    </div>

                    <div className="set-table">
                      <div className="set-table-head">
                        <span>Set</span>
                        <span>Suggested</span>
                        <span>Kg</span>
                        <span>Reps</span>
                        <span>Done</span>
                      </div>

                      {setRows.map((_, index) => {
                        const set = item.sets[index];
                        const completed = Boolean(set?.completed);
                        const values = getSetValues(item, target, set, index);
                        const previous = previousByExercise[item.exercise.id];
                        const suggestedWeight = previous?.suggested_weight ?? target?.target_weight;
                        const suggestedReps = previous?.suggested_reps ?? target?.target_reps;

                        return (
                          <div
                            key={set?.id ?? `planned-${item.id}-${index}`}
                            className={[
                              isSelected ? "set-table-row active" : "set-table-row",
                              completed ? "completed" : "",
                            ].join(" ")}
                          >
                            <span>{index + 1}</span>
                            <span>
                              {suggestedWeight ?? "-"} x {suggestedReps ?? "-"}
                            </span>
                            <input
                              aria-label={`${item.exercise.name} set ${index + 1} weight`}
                              inputMode="decimal"
                              value={values.weight}
                              onChange={(event) => onSetEditChange(item.id, index, "weight", event.target.value, values)}
                              disabled={session.status !== "IN_PROGRESS"}
                            />
                            <input
                              aria-label={`${item.exercise.name} set ${index + 1} reps`}
                              inputMode="numeric"
                              value={values.reps}
                              onChange={(event) => onSetEditChange(item.id, index, "reps", event.target.value, values)}
                              disabled={session.status !== "IN_PROGRESS"}
                            />
                            <button
                              type="button"
                              className={completed ? "complete-marker done" : "complete-marker"}
                              onClick={() => onCompleteSet(item, index, set, values)}
                              disabled={loading || session.status !== "IN_PROGRESS"}
                            >
                              {completed ? "Done" : "Complete"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>

            {activeExercise && (
              <form className="floating-set-form" onSubmit={onSaveManualSet}>
                <div>
                  <span>Selected</span>
                  <strong>{activeExercise.exercise.name}</strong>
                </div>

                {activePlannedExercise && (
                  <button type="button" className="ghost-action" onClick={() => onUsePlannedTarget(activePlannedExercise)}>
                    Use target
                  </button>
                )}

                {suggestion?.suggested_weight != null && suggestion.suggested_reps != null && (
                  <button type="button" className="ghost-action" onClick={onUseSuggestion}>
                    Use last
                  </button>
                )}

                <label>
                  <span>Kg</span>
                  <input
                    inputMode="decimal"
                    value={draft.weight}
                    onChange={(event) => onDraftChange({ ...draft, weight: event.target.value })}
                    placeholder="85"
                  />
                </label>
                <label>
                  <span>Reps</span>
                  <input
                    inputMode="numeric"
                    value={draft.reps}
                    onChange={(event) => onDraftChange({ ...draft, reps: event.target.value })}
                    placeholder="10"
                  />
                </label>
                <label>
                  <span>RPE</span>
                  <input
                    inputMode="decimal"
                    value={draft.rpe}
                    onChange={(event) => onDraftChange({ ...draft, rpe: event.target.value })}
                    placeholder="8"
                  />
                </label>
                <button className="primary-action" type="submit" disabled={loading || session.status !== "IN_PROGRESS"}>
                  Add Set
                </button>
              </form>
            )}
          </>
        )}

        {summary && (
          <section className="summary-band">
            <h2>Workout summary</h2>
            <div>
              <span>{summary.completed_sets} completed sets</span>
              <strong>{Math.round(summary.tonnage)} kg tonnage</strong>
            </div>
          </section>
        )}
      </section>
    </section>
  );
}
