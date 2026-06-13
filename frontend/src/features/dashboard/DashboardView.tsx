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
            <p className="eyebrow">Aktywne programy</p>
            <h2>Zarządzaj obecnymi cyklami treningowymi</h2>
            <span>Wybierz plan, przejrzyj sesje i rozpocznij trening.</span>
          </div>
          <button className="dark-action" type="button" disabled>
            Utwórz nowy plan
          </button>
        </header>

        {error && <div className="notice error">{error}</div>}

        <section className="stats-strip" aria-label="Metryki treningowe">
          <div>
            <span>Ukończone</span>
            <strong>{stats?.completed_workouts ?? 0}</strong>
          </div>
          <div>
            <span>Całkowita objętość</span>
            <strong>{Math.round(stats?.total_tonnage ?? 0)} kg</strong>
          </div>
          <div>
            <span>Objętość aktywna</span>
            <strong>{Math.round(tonnage)} kg</strong>
          </div>
        </section>

        <section id="plans" className="program-grid">
          {plans.length === 0 && <div className="empty-state">Nie masz jeszcze planów treningowych.</div>}

          {plans.map((plan) => (
            <article key={plan.id} className="program-card">
              <div className="card-topline">
                <span>{plan.name.toLowerCase().includes("hypertrophy") || plan.name.toLowerCase().includes("hipertrof") ? "Hipertrofia" : "Trening"}</span>
                <small>{plan.sessions.length}</small>
              </div>
              <h3>{plan.name}</h3>
              <p>{plan.description}</p>

              <div className="card-meta">
                <div>
                  <span>Częstotliwość</span>
                  <strong>{plan.sessions.length} / tydzień</strong>
                </div>
                <div>
                  <span>Postęp</span>
                  <strong>{stats?.completed_workouts ?? 0} ukończone</strong>
                </div>
              </div>

              <div className="mini-exercises">
                {plan.sessions.map((plannedSession) => (
                  <span key={plannedSession.id}>
                    {plannedSession.name}: {plannedSession.exercises.length} ćwiczenia
                  </span>
                ))}
              </div>

              <button className="secondary-action" type="button" onClick={() => onOpenPlan(plan)}>
                Wejdź w plan
              </button>
            </article>
          ))}
        </section>
      </section>
    </section>
  );
}
