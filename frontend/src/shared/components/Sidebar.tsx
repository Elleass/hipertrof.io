import { WorkoutSession } from "../api/client";

type SidebarProps = {
  mode: "dashboard" | "plan" | "session" | "history";
  loading: boolean;
  session: WorkoutSession | null;
  onNavigateDashboard: () => void;
  onNavigateHistory: () => void;
  onStartSession: () => void;
};

export function Sidebar({ mode, loading, session, onNavigateDashboard, onNavigateHistory, onStartSession }: SidebarProps) {
  const workoutMode = mode === "session" && session?.status === "IN_PROGRESS";

  return (
    <aside className={[mode === "session" ? "sidebar detail-sidebar" : "sidebar", workoutMode ? "workout-sidebar" : ""].join(" ")}>
      <div className={mode === "session" ? "brand-lockup large" : "brand-lockup"}>
        <strong>hipertrof.io</strong>
        <span>Precyzyjny trening</span>
      </div>

      {!workoutMode && (
        <button className="primary-action" type="button" onClick={onStartSession} disabled={loading || session?.status === "IN_PROGRESS"}>
          Rozpocznij sesję
        </button>
      )}

      <nav className="nav-list" aria-label="Główna nawigacja">
        <button className={mode === "dashboard" ? "active" : ""} type="button" onClick={onNavigateDashboard}>
          Plany treningowe
        </button>
        <button className={mode === "history" ? "active" : ""} type="button" onClick={onNavigateHistory}>
          Historia
        </button>
        {!workoutMode && (
          <button type="button" disabled>
            Profil
          </button>
        )}
      </nav>

      {!workoutMode && (
        <div className="sidebar-footer">
          <button type="button" disabled>
            Ustawienia
          </button>
          <button type="button" disabled>
            Pomoc
          </button>
        </div>
      )}
    </aside>
  );
}
