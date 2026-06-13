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
} from "../../shared/api/client";
import { Sidebar } from "../../shared/components/Sidebar";
import { PlannedTotals, PreviousByExercise, SetDraft, SetEdit } from "../../shared/types/app";
import { formatTimer, previousSetValue } from "../../shared/utils/workout";

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
  statusMessage: string | null;
  onAddExercise: () => void;
  onApplyPrevious: (item: WorkoutExercise) => void;
  onCompleteSet: (item: WorkoutExercise, index: number, existingSet: WorkoutSet | undefined, values: SetEdit) => void;
  onCompleteWorkout: () => void;
  onDraftChange: (draft: SetDraft) => void;
  onNavigateDashboard: () => void;
  onNavigateHistory: () => void;
  onSaveManualSet: (event: React.FormEvent<HTMLFormElement>) => void;
  onSelectExercise: (exerciseId: number) => void;
  onSelectWorkoutExercise: (item: WorkoutExercise) => void;
  onNextExercise: () => void;
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
  statusMessage,
  onAddExercise,
  onApplyPrevious,
  onCompleteSet,
  onCompleteWorkout,
  onDraftChange,
  onNavigateDashboard,
  onNavigateHistory,
  onSaveManualSet,
  onSelectExercise,
  onSelectWorkoutExercise,
  onNextExercise,
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
  const activeSets = activeExercise ? [...activeExercise.sets].sort((a, b) => a.set_number - b.set_number) : [];
  const activeExerciseIndex = session?.exercises.findIndex((item) => item.id === activeExercise?.id) ?? -1;
  const hasNextExercise = Boolean(session && activeExerciseIndex >= 0 && activeExerciseIndex < session.exercises.length - 1);
  const activePrevious = activeExercise ? previousByExercise[activeExercise.exercise.id] : undefined;

  return (
    <section className="app-frame session-frame">
      <Sidebar
        mode="session"
        loading={loading}
        session={session}
        onNavigateDashboard={onNavigateDashboard}
        onNavigateHistory={onNavigateHistory}
        onStartSession={onStartSession}
      />

      <section id="session-detail" className="session-content">
        <header className="session-header workout-header">
          <div>
            <p className="breadcrumb">
              Training Plans / {plan?.name ?? "Select Plan"} / {plannedSession?.name ?? "Session"}
            </p>
            <h2>{session?.status === "IN_PROGRESS" && activeExercise ? activeExercise.exercise.name : plannedSession?.name ?? "Choose a session"}</h2>
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
            <button
              className="primary-action finish-action"
              type="button"
              onClick={onCompleteWorkout}
              disabled={loading || completedSetCount === 0}
              title={completedSetCount === 0 ? "Complete at least one set first" : undefined}
            >
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
        {statusMessage && !error && <div className="notice success">{statusMessage}</div>}

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
            {session.exercises.length === 0 && session.status === "IN_PROGRESS" && (
              <div className="empty-state workout-empty">
                No active exercise yet. Choose one exercise to begin this ad-hoc session.
                <div className="session-picker compact-picker">
                  <select
                    value={selectedExerciseId ?? ""}
                    onChange={(event) => onSelectExercise(Number(event.target.value))}
                  >
                    {exercises.map((exercise) => (
                      <option key={exercise.id} value={exercise.id}>
                        {exercise.name}
                      </option>
                    ))}
                  </select>
                  <button className="dark-action" type="button" onClick={onAddExercise} disabled={loading}>
                    Add Exercise
                  </button>
                </div>
              </div>
            )}

            {activeExercise && (
              <section className="workout-layout">
                <article className="active-workout-card">
                  <div className="active-workout-top">
                    <div>
                      <p className="eyebrow">Current Exercise</p>
                      <h3>{activeExercise.exercise.name}</h3>
                      <span>
                        Target: {activePlannedExercise?.target_sets ?? activeSets.length} sets x{" "}
                        {activePlannedExercise?.target_reps ?? "-"} reps @ {activePlannedExercise?.target_weight ?? "-"} kg
                      </span>
                    </div>
                    <button
                      type="button"
                      className="ghost-action"
                      onClick={() => onApplyPrevious(activeExercise)}
                      disabled={session.status !== "IN_PROGRESS" || loading}
                    >
                      Use Previous Values
                    </button>
                  </div>

                  {activePrevious?.suggested_weight != null && (
                    <div className="previous-values-note">
                      Previous: {activePrevious.suggested_weight} kg x {activePrevious.suggested_reps}
                    </div>
                  )}

                  <div className="workout-set-list">
                    {activeSets.length === 0 && (
                      <div className="empty-state inline-empty">No sets added yet. Add an extra working set below.</div>
                    )}

                    {activeSets.map((set, index) => {
                      const values = getSetValues(activeExercise, activePlannedExercise, set, index);
                      const previousSet = previousSetValue(activePrevious, set.set_number);
                      const suggestedWeight = previousSet?.suggested_weight ?? activePrevious?.suggested_weight ?? activePlannedExercise?.target_weight;
                      const suggestedReps = previousSet?.suggested_reps ?? activePrevious?.suggested_reps ?? activePlannedExercise?.target_reps;
                      const edited = values.weight !== set.weight.toString() || values.reps !== set.reps.toString();

                      return (
                        <div
                          key={set.id}
                          className={[
                            "workout-set-card",
                            set.completed ? "completed" : "",
                            edited ? "edited" : "",
                          ].join(" ")}
                        >
                          <div className="set-number-block">
                            <span>Set</span>
                            <strong>{set.set_number}</strong>
                          </div>
                          <div className="suggested-block">
                            <span>Suggested</span>
                            <strong>
                              {suggestedWeight ?? "-"} x {suggestedReps ?? "-"}
                            </strong>
                            {edited && <small>Changed</small>}
                          </div>
                          <label>
                            <span>Kg</span>
                            <input
                              aria-label={`${activeExercise.exercise.name} set ${set.set_number} weight`}
                              inputMode="decimal"
                              value={values.weight}
                              onChange={(event) => onSetEditChange(activeExercise.id, index, "weight", event.target.value, values)}
                              disabled={session.status !== "IN_PROGRESS"}
                            />
                          </label>
                          <label>
                            <span>Reps</span>
                            <input
                              aria-label={`${activeExercise.exercise.name} set ${set.set_number} reps`}
                              inputMode="numeric"
                              value={values.reps}
                              onChange={(event) => onSetEditChange(activeExercise.id, index, "reps", event.target.value, values)}
                              disabled={session.status !== "IN_PROGRESS"}
                            />
                          </label>
                          <button
                            type="button"
                            className={set.completed ? "done-action saved" : "done-action"}
                            onClick={() => onCompleteSet(activeExercise, index, set, values)}
                            disabled={loading || session.status !== "IN_PROGRESS"}
                          >
                            {set.completed ? "Saved" : "Done"}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="workout-step-actions">
                    <button className="dark-action" type="button" onClick={onNextExercise} disabled={!hasNextExercise}>
                      Next Exercise
                    </button>
                    <span>{restRemaining > 0 ? `Rest ${formatTimer(restRemaining)}` : "Ready for next set"}</span>
                  </div>

                  {session.status === "IN_PROGRESS" && (
                    <details className="extra-set-details">
                      <summary>Add extra set</summary>
                      <form className="extra-set-form" onSubmit={onSaveManualSet}>
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
                        <button className="primary-action" type="submit" disabled={loading}>
                          Add Set
                        </button>
                      </form>
                    </details>
                  )}
                </article>

                <aside className="exercise-queue" aria-label="Workout exercises">
                  <p className="eyebrow">Exercise Queue</p>
                  {session.exercises.map((item) => {
                    const completed = item.sets.filter((set) => set.completed).length;
                    const total = item.sets.length;
                    const isSelected = selectedWorkoutExerciseId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={isSelected ? "queue-item active" : "queue-item"}
                        onClick={() => onSelectWorkoutExercise(item)}
                      >
                        <strong>{item.exercise.name}</strong>
                        <span>
                          {completed}/{total} sets
                        </span>
                      </button>
                    );
                  })}
                </aside>
              </section>
            )}
          </>
        )}

        {summary && (
          <section className="summary-band">
            <h2>Workout summary</h2>
            <div>
              <span>{summary.completed_sets} completed sets</span>
              <strong>{Math.round(summary.tonnage)} kg tonnage</strong>
              <span>{summary.duration_seconds == null ? "Duration -" : `Duration ${formatTimer(summary.duration_seconds)}`}</span>
            </div>
          </section>
        )}
      </section>
    </section>
  );
}
