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
import { formatTimer, formatWorkoutStatus, previousSetValue } from "../../shared/utils/workout";

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
              Plany treningowe / {plan?.name ?? "Wybierz plan"} / {plannedSession?.name ?? "Sesja"}
            </p>
            <h2>{session?.status === "IN_PROGRESS" && activeExercise ? activeExercise.exercise.name : plannedSession?.name ?? "Wybierz sesję"}</h2>
            <div className="session-tags">
              <span>{formatWorkoutStatus(session?.status ?? "READY")}</span>
              <span>
                {completedSetCount}/{plannedTotals.sets} serii
              </span>
              <span>{formatTimer(sessionElapsed)}</span>
              <span>Przerwa {formatTimer(restRemaining)}</span>
            </div>
          </div>
          {session?.status === "IN_PROGRESS" && (
            <button
              className="primary-action finish-action"
              type="button"
              onClick={onCompleteWorkout}
              disabled={loading || completedSetCount === 0}
              title={completedSetCount === 0 ? "Ukończ najpierw co najmniej jedną serię" : undefined}
            >
              Zakończ sesję
            </button>
          )}
        </header>

        <div className="progress-block">
          <div>
            <span>Postęp treningu</span>
            <strong>{progressPercent}%</strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {error && <div className="notice error">{error}</div>}
        {statusMessage && !error && <div className="notice success">{statusMessage}</div>}

        {!plannedSession && <div className="empty-state dark-empty">Nie znaleziono tej zaplanowanej sesji.</div>}

        {plannedSession && !session && (
          <>
            <div className="session-start-panel">
              <div>
                <strong>{plannedSession.name}</strong>
                <span>Sprawdź zaplanowane ćwiczenia i sugerowane wartości, a potem rozpocznij trening.</span>
              </div>
              {plan && (
                <button className="primary-action" type="button" onClick={() => onStartPlannedWorkout(plan, plannedSession)} disabled={loading}>
                  Rozpocznij sesję
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
                        Cel: {target.target_sets ?? "-"} serii x {target.target_reps ?? "-"} powt. @{" "}
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
                Brak aktywnego ćwiczenia. Wybierz ćwiczenie, żeby rozpocząć sesję ad hoc.
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
                    Dodaj ćwiczenie
                  </button>
                </div>
              </div>
            )}

            {activeExercise && (
              <section className="workout-layout">
                <article className="active-workout-card">
                  <div className="active-workout-top">
                    <div>
                      <p className="eyebrow">Aktualne ćwiczenie</p>
                      <h3>{activeExercise.exercise.name}</h3>
                      <span>
                        Cel: {activePlannedExercise?.target_sets ?? activeSets.length} serii x{" "}
                        {activePlannedExercise?.target_reps ?? "-"} powt. @ {activePlannedExercise?.target_weight ?? "-"} kg
                      </span>
                    </div>
                    <button
                      type="button"
                      className="ghost-action"
                      onClick={() => onApplyPrevious(activeExercise)}
                      disabled={session.status !== "IN_PROGRESS" || loading}
                    >
                      Użyj poprzednich wartości
                    </button>
                  </div>

                  {activePrevious?.suggested_weight != null && (
                    <div className="previous-values-note">
                      Poprzednio: {activePrevious.suggested_weight} kg x {activePrevious.suggested_reps}
                    </div>
                  )}

                  <div className="workout-set-list">
                    {activeSets.length === 0 && (
                      <div className="empty-state inline-empty">Nie dodano jeszcze serii. Dodaj poniżej dodatkową serię roboczą.</div>
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
                            <span>Seria</span>
                            <strong>{set.set_number}</strong>
                          </div>
                          <div className="suggested-block">
                            <span>Sugestia</span>
                            <strong>
                              {suggestedWeight ?? "-"} x {suggestedReps ?? "-"}
                            </strong>
                            {edited && <small>Zmieniono</small>}
                          </div>
                          <label>
                            <span>Kg</span>
                            <input
                              aria-label={`${activeExercise.exercise.name} seria ${set.set_number} ciężar`}
                              inputMode="decimal"
                              value={values.weight}
                              onChange={(event) => onSetEditChange(activeExercise.id, index, "weight", event.target.value, values)}
                              disabled={session.status !== "IN_PROGRESS"}
                            />
                          </label>
                          <label>
                            <span>Powt.</span>
                            <input
                              aria-label={`${activeExercise.exercise.name} seria ${set.set_number} powtórzenia`}
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
                            {set.completed ? "Zapisano" : "Zapisz"}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="workout-step-actions">
                    <button className="dark-action" type="button" onClick={onNextExercise} disabled={!hasNextExercise}>
                      Następne ćwiczenie
                    </button>
                    <span>{restRemaining > 0 ? `Przerwa ${formatTimer(restRemaining)}` : "Gotowe do następnej serii"}</span>
                  </div>

                  {session.status === "IN_PROGRESS" && (
                    <details className="extra-set-details">
                      <summary>Dodaj dodatkową serię</summary>
                      <form className="extra-set-form" onSubmit={onSaveManualSet}>
                        {activePlannedExercise && (
                          <button type="button" className="ghost-action" onClick={() => onUsePlannedTarget(activePlannedExercise)}>
                            Użyj celu
                          </button>
                        )}
                        {suggestion?.suggested_weight != null && suggestion.suggested_reps != null && (
                          <button type="button" className="ghost-action" onClick={onUseSuggestion}>
                            Użyj ostatnich
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
                          <span>Powt.</span>
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
                          Dodaj serię
                        </button>
                      </form>
                    </details>
                  )}
                </article>

                <aside className="exercise-queue" aria-label="Ćwiczenia w treningu">
                  <p className="eyebrow">Kolejka ćwiczeń</p>
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
                          {completed}/{total} serii
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
            <h2>Podsumowanie treningu</h2>
            <div>
              <span>{summary.completed_sets} ukończonych serii</span>
              <strong>{Math.round(summary.tonnage)} kg objętości</strong>
              <span>{summary.duration_seconds == null ? "Czas -" : `Czas ${formatTimer(summary.duration_seconds)}`}</span>
            </div>
          </section>
        )}
      </section>
    </section>
  );
}
