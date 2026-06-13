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
        <span>Precision Training</span>
      </div>

      {!workoutMode && (
        <button className="primary-action" type="button" onClick={onStartSession} disabled={loading || session?.status === "IN_PROGRESS"}>
          Start Session
        </button>
      )}

      <nav className="nav-list" aria-label="Primary navigation">
        <button className={mode === "dashboard" ? "active" : ""} type="button" onClick={onNavigateDashboard}>
          Training Plans
        </button>
        <button className={mode === "history" ? "active" : ""} type="button" onClick={onNavigateHistory}>
          History
        </button>
        {!workoutMode && (
          <button type="button" disabled>
            Profile
          </button>
        )}
      </nav>

      {!workoutMode && (
        <div className="sidebar-footer">
          <button type="button" disabled>
            Settings
          </button>
          <button type="button" disabled>
            Support
          </button>
        </div>
      )}
    </aside>
  );
}
