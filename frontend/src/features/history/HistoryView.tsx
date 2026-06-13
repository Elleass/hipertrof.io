import { WorkoutHistoryItem, WorkoutSession } from "../../shared/api/client";
import { Sidebar } from "../../shared/components/Sidebar";
import { formatTimer, formatWorkoutStatus } from "../../shared/utils/workout";

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
  return new Intl.DateTimeFormat("pl-PL", {
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
            <p className="eyebrow">Historia treningów</p>
            <h2>Ukończone treningi</h2>
            <span>Przeglądaj zakończone sesje, szczegóły serii, objętość i czas trwania.</span>
          </div>
        </header>

        {history.length === 0 ? (
          <div className="empty-state">Ukończone treningi pojawią się tutaj po zakończeniu sesji.</div>
        ) : (
          <section className="history-layout">
            <div className="history-list">
              {history.map((item) => (
                <button key={item.id} className="history-row" type="button" onClick={() => onOpenHistoryItem(item)}>
                  <span>{formatDate(item.completed_at)}</span>
                  <strong>{item.session_name}</strong>
                  <small>{formatWorkoutStatus(item.status)}</small>
                  <small>{item.completed_sets} serii</small>
                  <small>{Math.round(item.tonnage)} kg</small>
                  <small>{item.duration_seconds == null ? "-" : formatTimer(item.duration_seconds)}</small>
                </button>
              ))}
            </div>

            <div className="history-detail">
              {!selectedWorkout ? (
                <div className="empty-state">Wybierz ukończony trening, żeby sprawdzić jego serie.</div>
              ) : (
                <>
                  <div className="history-detail-header">
                    <div>
                      <p className="eyebrow">Szczegóły treningu</p>
                      <h3>{selectedWorkout.notes ?? "Ukończony trening"}</h3>
                      <div className="history-detail-metrics">
                        <span>{detailCompletedSets} ukończonych serii</span>
                        <span>{Math.round(detailTonnage)} kg objętości</span>
                        <span>{detailDuration == null ? "Czas -" : formatTimer(detailDuration)}</span>
                      </div>
                    </div>
                    <span>{formatWorkoutStatus(selectedWorkout.status)}</span>
                  </div>

                  <div className="session-exercises">
                    {selectedWorkout.exercises.map((exercise) => (
                      <article key={exercise.id} className="exercise-panel">
                        <div className="exercise-panel-header static-header">
                          <span>
                            <strong>{exercise.exercise.name}</strong>
                            <small>{exercise.sets.length} zapisanych serii</small>
                          </span>
                        </div>
                        <div className="set-table">
                          <div className="set-table-head">
                            <span>Seria</span>
                            <span>Status</span>
                            <span>Kg</span>
                            <span>Powt.</span>
                            <span>Gotowe</span>
                          </div>
                          {exercise.sets.map((set) => (
                            <div key={set.id} className={set.completed ? "set-table-row completed" : "set-table-row"}>
                              <span>{set.set_number}</span>
                              <span>{set.completed ? "Ukończona" : "Pominięta"}</span>
                              <span>{set.weight}</span>
                              <span>{set.reps}</span>
                              <span>{set.completed ? "Tak" : "-"}</span>
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
