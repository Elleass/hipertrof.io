import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  api,
  Exercise,
  PlannedExercise,
  PlannedSession,
  SmartAutofill,
  StatisticsSummary,
  WorkoutExercise,
  WorkoutPlan,
  WorkoutSet,
  WorkoutSession,
  WorkoutSummary,
} from "./api";
import { DashboardView } from "./components/DashboardView";
import { PlanDetailView } from "./components/PlanDetailView";
import { SessionDetailView } from "./components/SessionDetailView";
import { AppRoute, emptyDraft, parseRoute, plannedSetCount, SetDraft, SetEdit } from "./types";

export function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseRoute(window.location.pathname));
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [stats, setStats] = useState<StatisticsSummary | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [selectedWorkoutExerciseId, setSelectedWorkoutExerciseId] = useState<number | null>(null);
  const [suggestion, setSuggestion] = useState<SmartAutofill | null>(null);
  const [draft, setDraft] = useState<SetDraft>(emptyDraft);
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [setEdits, setSetEdits] = useState<Record<string, SetEdit>>({});
  const [previousByExercise, setPreviousByExercise] = useState<Record<number, SmartAutofill>>({});

  const selectedPlan = useMemo(() => {
    if (route.name === "plan" || route.name === "session") {
      return plans.find((plan) => plan.id === route.planId) ?? null;
    }
    return null;
  }, [plans, route]);

  const selectedPlannedSession = useMemo(() => {
    if (route.name !== "session") return null;
    return selectedPlan?.sessions.find((item) => item.id === route.plannedSessionId) ?? null;
  }, [route, selectedPlan]);

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
  const sessionElapsed = sessionStartedAt ? Math.floor((now - sessionStartedAt) / 1000) : 0;
  const restRemaining = restEndsAt ? Math.max(0, Math.ceil((restEndsAt - now) / 1000)) : 0;

  useEffect(() => {
    const onPopState = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    loadInitialData();
  }, []);

  function navigate(path: string) {
    window.history.pushState({}, "", path);
    setRoute(parseRoute(path));
    setError(null);
  }

  async function loadInitialData() {
    setError(null);
    try {
      const [exerciseList, planList, summaryStats] = await Promise.all([api.exercises(), api.plans(), api.stats()]);
      setExercises(exerciseList);
      setPlans(planList);
      setStats(summaryStats);
      setSelectedExerciseId(exerciseList[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load application data");
    }
  }

  async function refreshSession(sessionId: number) {
    const updated = await api.getWorkout(sessionId);
    setSession(updated);
    return updated;
  }

  async function startWorkout() {
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const nextSession = await api.startWorkout();
      setSession(nextSession);
      setSessionStartedAt(Date.now());
      setSelectedWorkoutExerciseId(null);
      setSuggestion(null);
      setDraft(emptyDraft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start workout");
    } finally {
      setLoading(false);
    }
  }

  async function startPlannedWorkout(plan: WorkoutPlan, plannedSession: PlannedSession) {
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const nextSession = await api.startWorkout({
        notes: plannedSession.name,
        plan_id: plan.id,
        planned_session_id: plannedSession.id,
      });
      const firstExercise = nextSession.exercises[0] ?? null;
      const firstTarget = plannedSession.exercises.find((item) => item.exercise.id === firstExercise?.exercise.id);

      setSession(nextSession);
      setSessionStartedAt(Date.now());
      setRestEndsAt(null);
      setSelectedWorkoutExerciseId(firstExercise?.id ?? null);
      setSuggestion(null);
      setDraft({
        weight: firstTarget?.target_weight?.toString() ?? "",
        reps: firstTarget?.target_reps?.toString() ?? "",
        rpe: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start planned workout");
    } finally {
      setLoading(false);
    }
  }

  function openPlan(plan: WorkoutPlan) {
    setSession(null);
    setSummary(null);
    setEditing(false);
    navigate(`/plans/${plan.id}`);
  }

  function openPlannedSession(plan: WorkoutPlan, plannedSession: PlannedSession) {
    setSession(null);
    setSelectedWorkoutExerciseId(null);
    setSuggestion(null);
    setDraft(emptyDraft);
    setSummary(null);
    setEditing(false);
    navigate(`/plans/${plan.id}/sessions/${plannedSession.id}`);
  }

  async function addExerciseToSession() {
    if (!session || selectedExerciseId === null) return;
    setLoading(true);
    setError(null);
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
      if (!updated.exercises.some((item) => item.id === workoutExercise.id)) {
        setSession({ ...updated, exercises: [...updated.exercises, workoutExercise] });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add exercise");
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
    try {
      const smart = await loadPreviousForExercise(item.exercise.id);
      if (smart.suggested_weight == null || smart.suggested_reps == null) {
        setError("No previous values found for this exercise yet");
        return;
      }

      const target = getTargetForWorkoutExercise(item);
      const rows = Math.max(plannedSetCount(target), item.sets.length);
      const nextEdits: Record<string, SetEdit> = {};
      for (let index = 0; index < rows; index += 1) {
        nextEdits[setEditKey(item.id, index)] = {
          weight: smart.suggested_weight.toString(),
          reps: smart.suggested_reps.toString(),
        };
      }
      setPreviousByExercise((current) => ({ ...current, [item.exercise.id]: smart }));
      setSetEdits((current) => ({ ...current, ...nextEdits }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load previous exercise values");
    }
  }

  async function selectWorkoutExercise(item: WorkoutExercise) {
    setSelectedWorkoutExerciseId(item.id);
    setError(null);
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
      setError(err instanceof Error ? err.message : "Could not load exercise suggestion");
    }
  }

  async function saveSet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedWorkoutExerciseId === null || !session) return;

    const weight = Number(draft.weight);
    const reps = Number(draft.reps);
    const rpe = draft.rpe ? Number(draft.rpe) : null;
    if (!Number.isFinite(weight) || !Number.isFinite(reps) || reps < 1) {
      setError("Enter a valid weight and reps count");
      return;
    }

    await createSet(selectedWorkoutExerciseId, weight, reps, rpe);
  }

  async function completeEditedSet(item: WorkoutExercise, index: number, existingSet: WorkoutSet | undefined, values: SetEdit) {
    const weight = Number(values.weight);
    const reps = Number(values.reps);
    if (!Number.isFinite(weight) || !Number.isFinite(reps) || reps < 1) {
      setError("Enter a valid weight and reps count");
      return;
    }

    if (existingSet) {
      await updateExistingSet(existingSet.id, weight, reps, true);
    } else {
      await createSet(item.id, weight, reps, null);
    }
    setSelectedWorkoutExerciseId(item.id);
  }

  async function createSet(workoutExerciseId: number, weight: number, reps: number, rpe: number | null) {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      await api.addSet(workoutExerciseId, { weight, reps, rpe });
      await refreshSession(session.id);
      setDraft({ weight: weight.toString(), reps: reps.toString(), rpe: "" });
      setRestEndsAt(Date.now() + 90_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save set");
    } finally {
      setLoading(false);
    }
  }

  async function updateExistingSet(setId: number, weight: number, reps: number, completed: boolean) {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      await api.updateSet(setId, { weight, reps, completed });
      await refreshSession(session.id);
      setRestEndsAt(Date.now() + 90_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update set");
    } finally {
      setLoading(false);
    }
  }

  async function persistEditedCompletedSets() {
    if (!session) return;
    for (const item of session.exercises) {
      for (let index = 0; index < item.sets.length; index += 1) {
        const set = item.sets[index];
        const edit = setEdits[setEditKey(item.id, index)];
        if (!edit || !set.completed) continue;

        const weight = Number(edit.weight);
        const reps = Number(edit.reps);
        if (!Number.isFinite(weight) || !Number.isFinite(reps) || reps < 1) continue;
        if (set.weight === weight && set.reps === reps) continue;

        await api.updateSet(set.id, { weight, reps, completed: true });
      }
    }
    await refreshSession(session.id);
  }

  async function completeWorkout() {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      await persistEditedCompletedSets();
      const completed = await api.completeWorkout(session.id);
      setSummary(completed);
      setSession(completed.session);
      setStats(await api.stats());
      setRestEndsAt(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete workout");
    } finally {
      setLoading(false);
    }
  }

  function setEditKey(workoutExerciseId: number, index: number): string {
    return `${workoutExerciseId}:${index}`;
  }

  function getSuggestedValues(target: PlannedExercise | null, exerciseId: number): SetEdit {
    const previous = previousByExercise[exerciseId];
    return {
      weight: (previous?.suggested_weight ?? target?.target_weight ?? 0).toString(),
      reps: (previous?.suggested_reps ?? target?.target_reps ?? 1).toString(),
    };
  }

  function getSetValues(item: WorkoutExercise, target: PlannedExercise | null, set: WorkoutSet | undefined, index: number): SetEdit {
    const edit = setEdits[setEditKey(item.id, index)];
    if (edit) return edit;
    if (set) return { weight: set.weight.toString(), reps: set.reps.toString() };
    return getSuggestedValues(target, item.exercise.id);
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

  return (
    <main className="app-shell">
      {route.name === "dashboard" && (
        <DashboardView
          error={error}
          loading={loading}
          plans={plans}
          session={session}
          stats={stats}
          tonnage={tonnage}
          onOpenPlan={openPlan}
          onNavigateDashboard={() => navigate("/")}
          onStartSession={startWorkout}
        />
      )}

      {route.name === "plan" && (
        <PlanDetailView
          editing={editing}
          loading={loading}
          plan={selectedPlan}
          session={session}
          onNavigateDashboard={() => navigate("/")}
          onOpenSession={openPlannedSession}
          onStartSession={startWorkout}
          onToggleEditing={() => setEditing(!editing)}
        />
      )}

      {route.name === "session" && (
        <SessionDetailView
          activeExercise={activeExercise}
          activePlannedExercise={activePlannedExercise}
          completedSetCount={completedSetCount}
          draft={draft}
          error={error}
          exercises={exercises}
          loading={loading}
          plan={selectedPlan}
          plannedSession={selectedPlannedSession}
          plannedTotals={plannedTotals}
          previousByExercise={previousByExercise}
          progressPercent={progressPercent}
          restRemaining={restRemaining}
          selectedExerciseId={selectedExerciseId}
          selectedWorkoutExerciseId={selectedWorkoutExerciseId}
          session={session}
          sessionElapsed={sessionElapsed}
          summary={summary}
          onAddExercise={addExerciseToSession}
          onApplyPrevious={applyPreviousToExercise}
          onCompleteSet={completeEditedSet}
          onCompleteWorkout={completeWorkout}
          onDraftChange={setDraft}
          onNavigateDashboard={() => navigate("/")}
          onSaveManualSet={saveSet}
          onSelectExercise={setSelectedExerciseId}
          onSelectWorkoutExercise={selectWorkoutExercise}
          onSetEditChange={updateSetEdit}
          onStartPlannedWorkout={startPlannedWorkout}
          onStartSession={startWorkout}
          onUsePlannedTarget={usePlannedTarget}
          onUseSuggestion={useSuggestion}
          getSetValues={getSetValues}
          getTargetForWorkoutExercise={getTargetForWorkoutExercise}
          suggestion={suggestion}
        />
      )}
    </main>
  );
}
