import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  api,
  Exercise,
  PlannedExercise,
  PlannedSession,
  SmartAutofill,
  WorkoutExercise,
  WorkoutPlan,
  WorkoutSet,
  WorkoutSession,
  WorkoutSummary,
} from "../../shared/api/client";
import { emptyDraft, SetDraft, SetEdit } from "../../shared/types/app";
import { plannedSetCount, previousSetValue } from "../../shared/utils/workout";

type UseWorkoutSessionOptions = {
  clearRestTimer: () => void;
  exercises: Exercise[];
  onWorkoutCompleted: () => Promise<void> | void;
  routePlannedSessionId: number | null;
  selectedPlannedSession: PlannedSession | null;
  setWorkoutStartedAt: (value: string | number | null) => void;
  startRestTimer: (seconds?: number) => void;
};

export function useWorkoutSession({
  clearRestTimer,
  exercises,
  onWorkoutCompleted,
  routePlannedSessionId,
  selectedPlannedSession,
  setWorkoutStartedAt,
  startRestTimer,
}: UseWorkoutSessionOptions) {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [selectedWorkoutExerciseId, setSelectedWorkoutExerciseId] = useState<number | null>(null);
  const [suggestion, setSuggestion] = useState<SmartAutofill | null>(null);
  const [draft, setDraft] = useState<SetDraft>(emptyDraft);
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [setEdits, setSetEdits] = useState<Record<string, SetEdit>>({});
  const [previousByExercise, setPreviousByExercise] = useState<Record<number, SmartAutofill>>({});

  useEffect(() => {
    if (selectedExerciseId !== null || exercises.length === 0) return;
    setSelectedExerciseId(exercises[0].id);
  }, [exercises, selectedExerciseId]);

  useEffect(() => {
    if (routePlannedSessionId === null || !selectedPlannedSession) return;

    let cancelled = false;
    api
      .activeWorkout(routePlannedSessionId)
      .then((activeSession) => {
        if (cancelled) return;
        if (activeSession) {
          hydrateWorkoutSession(activeSession, selectedPlannedSession);
          setSummary(null);
          setStatusMessage("Przywrócono aktywny trening");
          return;
        }

        setSession((current) =>
          current?.planned_session_id === routePlannedSessionId && current.status === "IN_PROGRESS" ? null : current,
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Nie udało się przywrócić aktywnego treningu"));

    return () => {
      cancelled = true;
    };
  }, [routePlannedSessionId, selectedPlannedSession?.id]);

  const activeExercise = useMemo(
    () => session?.exercises.find((item) => item.id === selectedWorkoutExerciseId) ?? null,
    [session, selectedWorkoutExerciseId],
  );

  const activePlannedExercise = useMemo(() => {
    if (!activeExercise || !selectedPlannedSession) return null;
    return selectedPlannedSession.exercises.find((item) => item.exercise.id === activeExercise.exercise.id) ?? null;
  }, [activeExercise, selectedPlannedSession]);

  const tonnage = useMemo(() => {
    if (!session) return 0;
    return session.exercises.reduce((total, item) => {
      return total + item.sets.reduce((exerciseTotal, set) => exerciseTotal + set.weight * set.reps, 0);
    }, 0);
  }, [session]);

  const plannedTotals = useMemo(() => {
    if (!selectedPlannedSession) return { sets: 0, exercises: 0 };
    return {
      exercises: selectedPlannedSession.exercises.length,
      sets: selectedPlannedSession.exercises.reduce((total, item) => total + plannedSetCount(item), 0),
    };
  }, [selectedPlannedSession]);

  const completedSetCount = useMemo(() => {
    if (!session) return 0;
    return session.exercises.reduce((total, item) => total + item.sets.filter((set) => set.completed).length, 0);
  }, [session]);

  const progressPercent = plannedTotals.sets > 0 ? Math.min(100, Math.round((completedSetCount / plannedTotals.sets) * 100)) : 0;

  async function refreshSession(sessionId: number) {
    const updated = await api.getWorkout(sessionId);
    setSession(updated);
    return updated;
  }

  function hydrateWorkoutSession(nextSession: WorkoutSession, plannedSession: PlannedSession | null = null) {
    const nextExercise =
      nextSession.exercises.find((item) => item.sets.some((set) => !set.completed)) ?? nextSession.exercises[0] ?? null;
    const firstTarget = plannedSession?.exercises.find((item) => item.exercise.id === nextExercise?.exercise.id);

    setSession(nextSession);
    setWorkoutStartedAt(nextSession.started_at);
    clearRestTimer();
    setSelectedWorkoutExerciseId(nextExercise?.id ?? null);
    setSuggestion(null);
    setSetEdits({});
    setDraft({
      weight: firstTarget?.target_weight?.toString() ?? "",
      reps: firstTarget?.target_reps?.toString() ?? "",
      rpe: "",
    });
  }

  async function startWorkout() {
    setLoading(true);
    setError(null);
    setStatusMessage(null);
    setSummary(null);
    try {
      const nextSession = await api.startWorkout();
      hydrateWorkoutSession(nextSession);
      setSelectedWorkoutExerciseId(null);
      setStatusMessage("Trening rozpoczęty");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się rozpocząć treningu");
    } finally {
      setLoading(false);
    }
  }

  async function startPlannedWorkout(plan: WorkoutPlan, plannedSession: PlannedSession) {
    setLoading(true);
    setError(null);
    setStatusMessage(null);
    setSummary(null);
    try {
      const nextSession = await api.startWorkout({
        notes: plannedSession.name,
        plan_id: plan.id,
        planned_session_id: plannedSession.id,
      });
      hydrateWorkoutSession(nextSession, plannedSession);
      setStatusMessage("Trening rozpoczęty");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się rozpocząć zaplanowanego treningu");
    } finally {
      setLoading(false);
    }
  }

  function resetWorkoutView() {
    setSession(null);
    setSelectedWorkoutExerciseId(null);
    setSuggestion(null);
    setDraft(emptyDraft);
    setSetEdits({});
    setSummary(null);
    setError(null);
    setStatusMessage(null);
    clearRestTimer();
  }

  async function addExerciseToSession() {
    if (!session || selectedExerciseId === null) return;
    setLoading(true);
    setError(null);
    setStatusMessage(null);
    try {
      const workoutExercise = await api.addExercise(session.id, selectedExerciseId);
      const smart = await api.smartAutofill(selectedExerciseId);
      const updated = await refreshSession(session.id);
      setSelectedWorkoutExerciseId(workoutExercise.id);
      setSuggestion(smart);
      setDraft({
        weight: smart.suggested_weight?.toString() ?? "",
        reps: smart.suggested_reps?.toString() ?? "",
        rpe: "",
      });
      setStatusMessage("Ćwiczenie dodane");
      if (!updated.exercises.some((item) => item.id === workoutExercise.id)) {
        setSession({ ...updated, exercises: [...updated.exercises, workoutExercise] });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się dodać ćwiczenia");
    } finally {
      setLoading(false);
    }
  }

  async function loadPreviousForExercise(exerciseId: number): Promise<SmartAutofill> {
    const cached = previousByExercise[exerciseId];
    if (cached) return cached;

    const smart = await api.smartAutofill(exerciseId);
    setPreviousByExercise((current) => ({ ...current, [exerciseId]: smart }));
    return smart;
  }

  async function applyPreviousToExercise(item: WorkoutExercise) {
    setError(null);
    setStatusMessage(null);
    try {
      const smart = await loadPreviousForExercise(item.exercise.id);
      if (smart.suggested_sets.length === 0 && (smart.suggested_weight == null || smart.suggested_reps == null)) {
        setError("Nie znaleziono poprzednich wartości dla tego ćwiczenia");
        return;
      }

      const target = getTargetForWorkoutExercise(item);
      const rows = item.sets.length || plannedSetCount(target);
      const nextEdits: Record<string, SetEdit> = {};
      for (let index = 0; index < rows; index += 1) {
        const previousSet = previousSetValue(smart, index + 1);
        const weight = previousSet?.suggested_weight ?? smart.suggested_weight;
        const reps = previousSet?.suggested_reps ?? smart.suggested_reps;
        if (weight == null || reps == null) continue;

        nextEdits[setEditKey(item.id, index)] = {
          weight: weight.toString(),
          reps: reps.toString(),
        };
      }
      setPreviousByExercise((current) => ({ ...current, [item.exercise.id]: smart }));
      setSetEdits((current) => ({ ...current, ...nextEdits }));
      setStatusMessage("Zastosowano poprzednie wartości");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się wczytać poprzednich wartości ćwiczenia");
    }
  }

  async function selectWorkoutExercise(item: WorkoutExercise) {
    setSelectedWorkoutExerciseId(item.id);
    setError(null);
    setStatusMessage(null);
    const target = getTargetForWorkoutExercise(item);
    try {
      const smart = await api.smartAutofill(item.exercise.id);
      setPreviousByExercise((current) => ({ ...current, [item.exercise.id]: smart }));
      setSuggestion(smart);
      setDraft({
        weight: target?.target_weight?.toString() ?? smart.suggested_weight?.toString() ?? "",
        reps: target?.target_reps?.toString() ?? smart.suggested_reps?.toString() ?? "",
        rpe: "",
      });
    } catch (err) {
      setSuggestion(null);
      setDraft({
        weight: target?.target_weight?.toString() ?? "",
        reps: target?.target_reps?.toString() ?? "",
        rpe: "",
      });
      setError(err instanceof Error ? err.message : "Nie udało się wczytać sugestii dla ćwiczenia");
    }
  }

  async function selectNextExercise() {
    if (!session || !activeExercise) return;
    const index = session.exercises.findIndex((item) => item.id === activeExercise.id);
    const nextExercise = session.exercises[index + 1];
    if (nextExercise) await selectWorkoutExercise(nextExercise);
  }

  async function saveSet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedWorkoutExerciseId === null || !session) return;

    const weight = Number(draft.weight);
    const reps = Number(draft.reps);
    const rpe = draft.rpe ? Number(draft.rpe) : null;
    if (!Number.isFinite(weight) || !Number.isFinite(reps) || reps < 1) {
      setError("Podaj prawidłowy ciężar i liczbę powtórzeń");
      return;
    }

    await createSet(selectedWorkoutExerciseId, weight, reps, rpe);
  }

  async function completeEditedSet(item: WorkoutExercise, index: number, existingSet: WorkoutSet | undefined, values: SetEdit) {
    if (session?.status !== "IN_PROGRESS") {
      setError("Ukończonych treningów nie można edytować");
      return;
    }

    if (!existingSet) {
      setError("Zaplanowana seria nie jest jeszcze dostępna. Uruchom sesję ponownie, żeby odtworzyć planowane serie.");
      return;
    }

    const weight = Number(values.weight);
    const reps = Number(values.reps);
    if (!Number.isFinite(weight) || !Number.isFinite(reps) || reps < 1) {
      setError("Podaj prawidłowy ciężar i liczbę powtórzeń");
      return;
    }

    if (await updateExistingSet(existingSet.id, weight, reps, true)) {
      clearSetEdit(item.id, index);
      setStatusMessage(`Seria ${existingSet.set_number} zapisana`);
    }
    setSelectedWorkoutExerciseId(item.id);
  }

  async function createSet(workoutExerciseId: number, weight: number, reps: number, rpe: number | null): Promise<boolean> {
    if (!session) return false;
    setLoading(true);
    setError(null);
    setStatusMessage(null);
    try {
      await api.addSet(workoutExerciseId, { weight, reps, rpe });
      await refreshSession(session.id);
      setDraft({ weight: weight.toString(), reps: reps.toString(), rpe: "" });
      startRestTimer();
      setStatusMessage("Dodatkowa seria zapisana");
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać serii");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function updateExistingSet(setId: number, weight: number, reps: number, completed: boolean): Promise<boolean> {
    if (!session) return false;
    setLoading(true);
    setError(null);
    setStatusMessage(null);
    try {
      await api.updateSet(setId, { weight, reps, completed });
      await refreshSession(session.id);
      startRestTimer();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zaktualizować serii");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function persistEditedCompletedSets() {
    if (!session) return;
    const clearedKeys: string[] = [];
    for (const item of session.exercises) {
      for (let index = 0; index < item.sets.length; index += 1) {
        const set = item.sets[index];
        const editKey = setEditKey(item.id, index);
        const edit = setEdits[editKey];
        if (!edit || !set.completed) continue;

        const weight = Number(edit.weight);
        const reps = Number(edit.reps);
        if (!Number.isFinite(weight) || !Number.isFinite(reps) || reps < 1) continue;
        if (set.weight === weight && set.reps === reps) continue;

        await api.updateSet(set.id, { weight, reps, completed: true });
        clearedKeys.push(editKey);
      }
    }
    if (clearedKeys.length > 0) {
      setSetEdits((current) => {
        const next = { ...current };
        for (const key of clearedKeys) delete next[key];
        return next;
      });
    }
    await refreshSession(session.id);
  }

  async function completeWorkout() {
    if (!session) return;
    setLoading(true);
    setError(null);
    setStatusMessage(null);
    try {
      await persistEditedCompletedSets();
      const completed = await api.completeWorkout(session.id);
      setSummary(completed);
      setSession(completed.session);
      clearRestTimer();
      setStatusMessage("Trening zakończony");
      await onWorkoutCompleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zakończyć treningu");
    } finally {
      setLoading(false);
    }
  }

  function setEditKey(workoutExerciseId: number, index: number): string {
    return `${workoutExerciseId}:${index}`;
  }

  function clearSetEdit(workoutExerciseId: number, index: number) {
    const key = setEditKey(workoutExerciseId, index);
    setSetEdits((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function getSuggestedValues(target: PlannedExercise | null, exerciseId: number, index: number): SetEdit {
    const previous = previousByExercise[exerciseId];
    const previousSet = previousSetValue(previous, index + 1);
    return {
      weight: (previousSet?.suggested_weight ?? previous?.suggested_weight ?? target?.target_weight ?? 0).toString(),
      reps: (previousSet?.suggested_reps ?? previous?.suggested_reps ?? target?.target_reps ?? 1).toString(),
    };
  }

  function getSetValues(item: WorkoutExercise, target: PlannedExercise | null, set: WorkoutSet | undefined, index: number): SetEdit {
    const edit = setEdits[setEditKey(item.id, index)];
    if (edit) return edit;
    if (set) return { weight: set.weight.toString(), reps: set.reps.toString() };
    return getSuggestedValues(target, item.exercise.id, index);
  }

  function updateSetEdit(workoutExerciseId: number, index: number, field: keyof SetEdit, value: string, currentValues: SetEdit) {
    const key = setEditKey(workoutExerciseId, index);
    setSetEdits((current) => ({
      ...current,
      [key]: {
        weight: current[key]?.weight ?? currentValues.weight,
        reps: current[key]?.reps ?? currentValues.reps,
        [field]: value,
      },
    }));
  }

  function getTargetForWorkoutExercise(item: WorkoutExercise): PlannedExercise | null {
    if (!selectedPlannedSession) return null;
    return selectedPlannedSession.exercises.find((target) => target.exercise.id === item.exercise.id) ?? null;
  }

  function useSuggestion() {
    if (suggestion?.suggested_weight == null || suggestion.suggested_reps == null) return;
    setDraft({
      weight: suggestion.suggested_weight.toString(),
      reps: suggestion.suggested_reps.toString(),
      rpe: draft.rpe,
    });
  }

  function usePlannedTarget(target: PlannedExercise) {
    setDraft({
      weight: target.target_weight?.toString() ?? draft.weight,
      reps: target.target_reps?.toString() ?? draft.reps,
      rpe: draft.rpe,
    });
  }

  return {
    activeExercise,
    activePlannedExercise,
    addExerciseToSession,
    applyPreviousToExercise,
    clearError: () => setError(null),
    completeEditedSet,
    completedSetCount,
    completeWorkout,
    draft,
    error,
    getSetValues,
    getTargetForWorkoutExercise,
    loading,
    plannedTotals,
    previousByExercise,
    progressPercent,
    resetWorkoutView,
    saveSet,
    selectedExerciseId,
    selectedWorkoutExerciseId,
    selectNextExercise,
    selectWorkoutExercise,
    session,
    setDraft,
    setSelectedExerciseId,
    startPlannedWorkout,
    startWorkout,
    statusMessage,
    suggestion,
    summary,
    tonnage,
    updateSetEdit,
    usePlannedTarget,
    useSuggestion,
  };
}
