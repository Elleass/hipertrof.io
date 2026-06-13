import { useEffect, useState } from "react";
import { api, WorkoutHistoryItem, WorkoutSession } from "../../shared/api/client";

export function useWorkoutHistory(navigate: (path: string) => void) {
  const [history, setHistory] = useState<WorkoutHistoryItem[]>([]);
  const [selectedHistoryWorkout, setSelectedHistoryWorkout] = useState<WorkoutSession | null>(null);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<WorkoutHistoryItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refreshHistory();
  }, []);

  async function refreshHistory() {
    setLoading(true);
    setError(null);
    try {
      setHistory(await api.history());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load workout history");
    } finally {
      setLoading(false);
    }
  }

  async function loadHistoryDetail(sessionId: number) {
    setLoading(true);
    setError(null);
    try {
      setSelectedHistoryItem(history.find((item) => item.id === sessionId) ?? null);
      setSelectedHistoryWorkout(await api.historyDetail(sessionId));
    } catch (err) {
      setSelectedHistoryWorkout(null);
      setSelectedHistoryItem(null);
      setError(err instanceof Error ? err.message : "Could not load workout history");
    } finally {
      setLoading(false);
    }
  }

  async function openHistoryItem(item: WorkoutHistoryItem) {
    setSelectedHistoryItem(item);
    navigate(`/history/${item.id}`);
    await loadHistoryDetail(item.id);
  }

  return {
    error,
    history,
    loadHistoryDetail,
    loading,
    openHistoryItem,
    refreshHistory,
    selectedHistoryItem,
    selectedHistoryWorkout,
  };
}
