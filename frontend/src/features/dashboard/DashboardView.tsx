import { StatisticsSummary, WorkoutPlan, WorkoutSession } from "../../shared/api/client";
import { Sidebar } from "../../shared/components/Sidebar";

type DashboardViewProps = {
  error: string | null;
  loading: boolean;
  plans: WorkoutPlan[];
  session: WorkoutSession | null;
  stats: StatisticsSummary | null;
  tonnage: number;
  onOpenPlan: (plan: WorkoutPlan) => void;
  onNavigateDashboard: () => void;
  onNavigateHistory: () => void;
  onStartSession: () => void;
};

export function DashboardView({
  error,
  loading,
  plans,
  session,
  stats,
  tonnage,
  onOpenPlan,
  onNavigateDashboard,
  onNavigateHistory,
  onStartSession,
}: DashboardViewProps) {
  return (
    <section className="app-frame">
      <Sidebar
        mode="dashboard"
        loading={loading}
        session={session}
        onNavigateDashboard={onNavigateDashboard}
        onNavigateHistory={onNavigateHistory}
        onStartSession={onStartSession}
      />

      <section className="dashboard-content">
        <header className="content-header">
          <div>
            <p className="eyebrow">Active Programs</p>
            <h2>Manage your current training cycles</h2>
            <span>Choose a plan, review its sessions, then start training.</span>
          </div>
          <button className="dark-action" type="button" disabled>
            Create New Plan
          </button>
        </header>

        {error && <div className="notice error">{error}</div>}

        <section className="stats-strip" aria-label="Training metrics">
          <div>
            <span>Completed</span>
            <strong>{stats?.completed_workouts ?? 0}</strong>
          </div>
          <div>
            <span>Total tonnage</span>
            <strong>{Math.round(stats?.total_tonnage ?? 0)} kg</strong>
          </div>
          <div>
            <span>Active tonnage</span>
            <strong>{Math.round(tonnage)} kg</strong>
          </div>
        </section>

        <section id="plans" className="program-grid">
          {plans.length === 0 && <div className="empty-state">No training plans yet.</div>}

          {plans.map((plan) => (
            <article key={plan.id} className="program-card">
              <div className="card-topline">
                <span>{plan.name.includes("Hypertrophy") ? "Hypertrophy" : "Training"}</span>
                <small>{plan.sessions.length}</small>
              </div>
              <h3>{plan.name}</h3>
              <p>{plan.description}</p>

              <div className="card-meta">
                <div>
                  <span>Frequency</span>
                  <strong>{plan.sessions.length} / week</strong>
                </div>
                <div>
                  <span>Progress</span>
                  <strong>{stats?.completed_workouts ?? 0} done</strong>
                </div>
              </div>

              <div className="mini-exercises">
                {plan.sessions.map((plannedSession) => (
                  <span key={plannedSession.id}>
                    {plannedSession.name}: {plannedSession.exercises.length} exercises
                  </span>
                ))}
              </div>

              <button className="secondary-action" type="button" onClick={() => onOpenPlan(plan)}>
                Enter Plan
              </button>
            </article>
          ))}
        </section>
      </section>
    </section>
  );
}
