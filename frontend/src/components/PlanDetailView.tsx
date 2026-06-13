import { PlannedSession, WorkoutPlan, WorkoutSession } from "../api";
import { Sidebar } from "./Sidebar";

type PlanDetailViewProps = {
  editing: boolean;
  loading: boolean;
  plan: WorkoutPlan | null;
  session: WorkoutSession | null;
  onNavigateDashboard: () => void;
  onOpenSession: (plan: WorkoutPlan, plannedSession: PlannedSession) => void;
  onStartSession: () => void;
  onToggleEditing: () => void;
};

export function PlanDetailView({
  editing,
  loading,
  plan,
  session,
  onNavigateDashboard,
  onOpenSession,
  onStartSession,
  onToggleEditing,
}: PlanDetailViewProps) {
  return (
    <section className="app-frame">
      <Sidebar
        mode="plan"
        loading={loading}
        session={session}
        onNavigateDashboard={onNavigateDashboard}
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
                <strong>Editing placeholder</strong>
                <span>Exercise, set, repetition, and weight editing will be persisted in the next backend pass.</span>
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
                    {plannedSession.exercises.map((target) => (
                      <span key={target.id}>
                        {target.exercise.name}: {target.target_sets} x {target.target_reps} @ {target.target_weight} kg
                      </span>
                    ))}
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
