import { WorkoutSession } from "../api";

type SidebarProps = {
  mode: "dashboard" | "plan" | "session";
  loading: boolean;
  session: WorkoutSession | null;
  onNavigateDashboard: () => void;
  onStartSession: () => void;
};

export function Sidebar({ mode, loading, session, onNavigateDashboard, onStartSession }: SidebarProps) {
  return (
    <aside className={mode === "session" ? "sidebar detail-sidebar" : "sidebar"}>
      <div className={mode === "session" ? "brand-lockup large" : "brand-lockup"}>
        <strong>hipertrof.io</strong>
        <span>Precision Training</span>
      </div>

      <button className="primary-action" type="button" onClick={onStartSession} disabled={loading || session?.status === "IN_PROGRESS"}>
        Start Session
      </button>

      <nav className="nav-list" aria-label="Primary navigation">
        <button className={mode === "dashboard" ? "active" : ""} type="button" onClick={onNavigateDashboard}>
          Training Plans
        </button>
        <button type="button" disabled>
          History
        </button>
        <button type="button" disabled>
          Profile
        </button>
      </nav>

      <div className="sidebar-footer">
        <button type="button" disabled>
          Settings
        </button>
        <button type="button" disabled>
          Support
        </button>
      </div>
    </aside>
  );
}
