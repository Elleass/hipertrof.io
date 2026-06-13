import { FormEvent } from "react";
import { PlannedExercise, PlannedSession, WorkoutPlan, WorkoutSession } from "../../shared/api/client";
import { Sidebar } from "../../shared/components/Sidebar";

type PlanDetailViewProps = {
  editing: boolean;
  loading: boolean;
  plan: WorkoutPlan | null;
  session: WorkoutSession | null;
  onNavigateDashboard: () => void;
  onNavigateHistory: () => void;
  onOpenSession: (plan: WorkoutPlan, plannedSession: PlannedSession) => void;
  onStartSession: () => void;
  onToggleEditing: () => void;
  onUpdatePlannedExercise: (
    plannedExercise: PlannedExercise,
    payload: { target_sets: number; target_reps: number; target_weight: number },
  ) => void;
};

export function PlanDetailView({
  editing,
  loading,
  plan,
  session,
  onNavigateDashboard,
  onNavigateHistory,
  onOpenSession,
  onStartSession,
  onToggleEditing,
  onUpdatePlannedExercise,
}: PlanDetailViewProps) {
  function saveTarget(event: FormEvent<HTMLFormElement>, plannedExercise: PlannedExercise) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onUpdatePlannedExercise(plannedExercise, {
      target_sets: Number(form.get("target_sets")),
      target_reps: Number(form.get("target_reps")),
      target_weight: Number(form.get("target_weight")),
    });
  }

  return (
    <section className="app-frame">
      <Sidebar
        mode="plan"
        loading={loading}
        session={session}
        onNavigateDashboard={onNavigateDashboard}
        onNavigateHistory={onNavigateHistory}
        onStartSession={onStartSession}
      />

      <section className="dashboard-content">
        {!plan ? (
          <div className="empty-state">Training plan was not found.</div>
        ) : (
          <>
            <header className="content-header">
              <div>
                <p className="eyebrow">Training Plans / Selected Plan</p>
                <h2>{plan.name}</h2>
                <span>{plan.description}</span>
              </div>
              <button className="dark-action" type="button" onClick={onToggleEditing}>
                {editing ? "Close Edit" : "Edit Plan"}
              </button>
            </header>

            {editing && (
              <div className="edit-panel">
                <strong>Edit planned targets</strong>
                <span>Update sets, reps, and kg for exercises already assigned to this plan.</span>
              </div>
            )}

            <section className="plan-detail-grid">
              {plan.sessions.map((plannedSession) => (
                <article key={plannedSession.id} className="session-card">
                  <div className="card-topline">
                    <span>Session {plannedSession.order_index}</span>
                    <small>{plannedSession.exercises.length}</small>
                  </div>
                  <h3>{plannedSession.name}</h3>
                  <div className="mini-exercises">
                    {plannedSession.exercises.map((target) =>
                      editing ? (
                        <form key={target.id} className="target-edit-row" onSubmit={(event) => saveTarget(event, target)}>
                          <strong>{target.exercise.name}</strong>
                          <input name="target_sets" type="number" min="1" defaultValue={target.target_sets ?? 1} aria-label={`${target.exercise.name} sets`} />
                          <input name="target_reps" type="number" min="1" defaultValue={target.target_reps ?? 1} aria-label={`${target.exercise.name} reps`} />
                          <input
                            name="target_weight"
                            type="number"
                            min="0"
                            step="0.5"
                            defaultValue={target.target_weight ?? 0}
                            aria-label={`${target.exercise.name} weight`}
                          />
                          <button className="ghost-action" type="submit">
                            Save
                          </button>
                        </form>
                      ) : (
                        <span key={target.id}>
                          {target.exercise.name}: {target.target_sets} x {target.target_reps} @ {target.target_weight} kg
                        </span>
                      ),
                    )}
                  </div>
                  <button className="secondary-action" type="button" onClick={() => onOpenSession(plan, plannedSession)}>
                    Open Session
                  </button>
                </article>
              ))}
            </section>
          </>
        )}
      </section>
    </section>
  );
}
