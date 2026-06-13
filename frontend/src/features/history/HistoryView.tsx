import { WorkoutHistoryItem, WorkoutSession } from "../../shared/api/client";
import { Sidebar } from "../../shared/components/Sidebar";
import { formatTimer } from "../../shared/utils/workout";

type HistoryViewProps = {
  history: WorkoutHistoryItem[];
  loading: boolean;
  selectedItem: WorkoutHistoryItem | null;
  selectedWorkout: WorkoutSession | null;
  session: WorkoutSession | null;
  onNavigateDashboard: () => void;
  onNavigateHistory: () => void;
  onOpenHistoryItem: (item: WorkoutHistoryItem) => void;
  onStartSession: () => void;
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function HistoryView({
  history,
  loading,
  selectedItem,
  selectedWorkout,
  session,
  onNavigateDashboard,
  onNavigateHistory,
  onOpenHistoryItem,
  onStartSession,
}: HistoryViewProps) {
  const detailCompletedSets =
    selectedItem?.completed_sets ??
    selectedWorkout?.exercises.reduce((total, exercise) => total + exercise.sets.filter((set) => set.completed).length, 0) ??
    0;
  const detailTonnage =
    selectedItem?.tonnage ??
    selectedWorkout?.exercises.reduce(
      (total, exercise) =>
        total + exercise.sets.filter((set) => set.completed).reduce((exerciseTotal, set) => exerciseTotal + set.weight * set.reps, 0),
      0,
    ) ??
    0;
  const detailDuration =
    selectedItem?.duration_seconds ??
    (selectedWorkout?.completed_at
      ? Math.max(0, Math.floor((new Date(selectedWorkout.completed_at).getTime() - new Date(selectedWorkout.started_at).getTime()) / 1000))
      : null);

  return (
    <section className="app-frame">
      <Sidebar
        mode="history"
        loading={loading}
        session={session}
        onNavigateDashboard={onNavigateDashboard}
        onNavigateHistory={onNavigateHistory}
        onStartSession={onStartSession}
      />

      <section className="dashboard-content">
        <header className="content-header">
          <div>
            <p className="eyebrow">Training History</p>
            <h2>Completed workouts</h2>
            <span>Review finished sessions, set details, tonnage, and duration.</span>
          </div>
        </header>

        {history.length === 0 ? (
          <div className="empty-state">Completed workouts will appear here after finishing a session.</div>
        ) : (
          <section className="history-layout">
            <div className="history-list">
              {history.map((item) => (
                <button key={item.id} className="history-row" type="button" onClick={() => onOpenHistoryItem(item)}>
                  <span>{formatDate(item.completed_at)}</span>
                  <strong>{item.session_name}</strong>
                  <small>{item.status}</small>
                  <small>{item.completed_sets} sets</small>
                  <small>{Math.round(item.tonnage)} kg</small>
                  <small>{item.duration_seconds == null ? "-" : formatTimer(item.duration_seconds)}</small>
                </button>
              ))}
            </div>

            <div className="history-detail">
              {!selectedWorkout ? (
                <div className="empty-state">Choose a completed workout to inspect its sets.</div>
              ) : (
                <>
                  <div className="history-detail-header">
                    <div>
                      <p className="eyebrow">Workout Detail</p>
                      <h3>{selectedWorkout.notes ?? "Completed workout"}</h3>
                      <div className="history-detail-metrics">
                        <span>{detailCompletedSets} completed sets</span>
                        <span>{Math.round(detailTonnage)} kg tonnage</span>
                        <span>{detailDuration == null ? "Duration -" : formatTimer(detailDuration)}</span>
                      </div>
                    </div>
                    <span>{selectedWorkout.status}</span>
                  </div>

                  <div className="session-exercises">
                    {selectedWorkout.exercises.map((exercise) => (
                      <article key={exercise.id} className="exercise-panel">
                        <div className="exercise-panel-header static-header">
                          <span>
                            <strong>{exercise.exercise.name}</strong>
                            <small>{exercise.sets.length} logged sets</small>
                          </span>
                        </div>
                        <div className="set-table">
                          <div className="set-table-head">
                            <span>Set</span>
                            <span>Status</span>
                            <span>Kg</span>
                            <span>Reps</span>
                            <span>Done</span>
                          </div>
                          {exercise.sets.map((set) => (
                            <div key={set.id} className={set.completed ? "set-table-row completed" : "set-table-row"}>
                              <span>{set.set_number}</span>
                              <span>{set.completed ? "Completed" : "Skipped"}</span>
                              <span>{set.weight}</span>
                              <span>{set.reps}</span>
                              <span>{set.completed ? "Done" : "-"}</span>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
        )}
      </section>
    </section>
  );
}
