import { useEffect, useMemo, useState } from "react";
import { api, Exercise, PlannedExercise, StatisticsSummary, WorkoutPlan } from "../../shared/api/client";

export function useTrainingPlans() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [stats, setStats] = useState<StatisticsSummary | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTrainingData();
  }, []);

  const firstExerciseId = useMemo(() => exercises[0]?.id ?? null, [exercises]);

  async function loadTrainingData() {
    setLoading(true);
    setError(null);
    try {
      const [exerciseList, planList, summaryStats] = await Promise.all([api.exercises(), api.plans(), api.stats()]);
      setExercises(exerciseList);
      setPlans(planList);
      setStats(summaryStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load training data");
    } finally {
      setLoading(false);
    }
  }

  async function refreshPlans() {
    setPlans(await api.plans());
  }

  async function refreshStats() {
    setStats(await api.stats());
  }

  async function updatePlannedExercise(
    plannedExercise: PlannedExercise,
    payload: { target_sets: number; target_reps: number; target_weight: number },
  ) {
    setLoading(true);
    setError(null);
    try {
      await api.updatePlannedExercise(plannedExercise.id, payload);
      await refreshPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update planned exercise");
    } finally {
      setLoading(false);
    }
  }

  return {
    editing,
    error,
    exercises,
    firstExerciseId,
    loading,
    plans,
    refreshPlans,
    refreshStats,
    setEditing,
    stats,
    updatePlannedExercise,
  };
}
