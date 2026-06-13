import { useEffect, useMemo } from "react";
import { DashboardView } from "./features/dashboard/DashboardView";
import { HistoryView } from "./features/history/HistoryView";
import { useWorkoutHistory } from "./features/history/useWorkoutHistory";
import { PlanDetailView } from "./features/plans/PlanDetailView";
import { useTrainingPlans } from "./features/plans/useTrainingPlans";
import { SessionDetailView } from "./features/workout-session/SessionDetailView";
import { useTimers } from "./features/workout-session/useTimers";
import { useWorkoutSession } from "./features/workout-session/useWorkoutSession";
import { PlannedSession, WorkoutPlan } from "./shared/api/client";
import { useWorkoutNavigation } from "./shared/hooks/useWorkoutNavigation";

export function App() {
  const navigation = useWorkoutNavigation();
  const timers = useTimers();
  const trainingPlans = useTrainingPlans();
  const workoutHistory = useWorkoutHistory(navigation.navigate);

  const selectedPlan = useMemo(() => {
    const route = navigation.route;
    if (route.name === "plan" || route.name === "session") {
      return trainingPlans.plans.find((plan) => plan.id === route.planId) ?? null;
    }
    return null;
  }, [trainingPlans.plans, navigation.route]);

  const selectedPlannedSession = useMemo(() => {
    const route = navigation.route;
    if (route.name !== "session") return null;
    return selectedPlan?.sessions.find((item) => item.id === route.plannedSessionId) ?? null;
  }, [navigation.route, selectedPlan]);

  const routePlannedSessionId = navigation.route.name === "session" ? navigation.route.plannedSessionId : null;
  const routeHistoryId = navigation.route.name === "historyDetail" ? navigation.route.sessionId : null;

  const workout = useWorkoutSession({
    clearRestTimer: timers.clearRestTimer,
    exercises: trainingPlans.exercises,
    onWorkoutCompleted: async () => {
      await Promise.all([trainingPlans.refreshStats(), workoutHistory.refreshHistory()]);
    },
    routePlannedSessionId,
    selectedPlannedSession,
    setWorkoutStartedAt: timers.setWorkoutStartedAt,
    startRestTimer: timers.startRestTimer,
  });

  useEffect(() => {
    if (trainingPlans.firstExerciseId !== null) {
      workout.setSelectedExerciseId(trainingPlans.firstExerciseId);
    }
  }, [trainingPlans.firstExerciseId]);

  useEffect(() => {
    if (routeHistoryId !== null) {
      workoutHistory.loadHistoryDetail(routeHistoryId);
    }
  }, [routeHistoryId]);

  const loading = trainingPlans.loading || workout.loading || workoutHistory.loading;
  const dashboardError = trainingPlans.error ?? workout.error ?? workoutHistory.error;
  const sessionError = workout.error ?? trainingPlans.error;

  function openPlan(plan: WorkoutPlan) {
    workout.resetWorkoutView();
    trainingPlans.setEditing(false);
    navigation.navigate(`/plans/${plan.id}`);
  }

  function openPlannedSession(plan: WorkoutPlan, plannedSession: PlannedSession) {
    workout.resetWorkoutView();
    trainingPlans.setEditing(false);
    navigation.navigate(`/plans/${plan.id}/sessions/${plannedSession.id}`);
  }

  return (
    <main className="app-shell">
      {navigation.route.name === "dashboard" && (
        <DashboardView
          error={dashboardError}
          loading={loading}
          plans={trainingPlans.plans}
          session={workout.session}
          stats={trainingPlans.stats}
          tonnage={workout.tonnage}
          onOpenPlan={openPlan}
          onNavigateDashboard={navigation.navigateDashboard}
          onNavigateHistory={navigation.navigateHistory}
          onStartSession={workout.startWorkout}
        />
      )}

      {navigation.route.name === "plan" && (
        <PlanDetailView
          editing={trainingPlans.editing}
          loading={loading}
          plan={selectedPlan}
          session={workout.session}
          onNavigateDashboard={navigation.navigateDashboard}
          onNavigateHistory={navigation.navigateHistory}
          onOpenSession={openPlannedSession}
          onStartSession={workout.startWorkout}
          onToggleEditing={() => trainingPlans.setEditing(!trainingPlans.editing)}
          onUpdatePlannedExercise={trainingPlans.updatePlannedExercise}
        />
      )}

      {navigation.route.name === "session" && (
        <SessionDetailView
          activeExercise={workout.activeExercise}
          activePlannedExercise={workout.activePlannedExercise}
          completedSetCount={workout.completedSetCount}
          draft={workout.draft}
          error={sessionError}
          exercises={trainingPlans.exercises}
          loading={loading}
          plan={selectedPlan}
          plannedSession={selectedPlannedSession}
          plannedTotals={workout.plannedTotals}
          previousByExercise={workout.previousByExercise}
          progressPercent={workout.progressPercent}
          restRemaining={timers.restRemaining}
          selectedExerciseId={workout.selectedExerciseId}
          selectedWorkoutExerciseId={workout.selectedWorkoutExerciseId}
          session={workout.session}
          sessionElapsed={timers.sessionElapsed}
          statusMessage={workout.statusMessage}
          summary={workout.summary}
          onAddExercise={workout.addExerciseToSession}
          onApplyPrevious={workout.applyPreviousToExercise}
          onCompleteSet={workout.completeEditedSet}
          onCompleteWorkout={workout.completeWorkout}
          onDraftChange={workout.setDraft}
          onNavigateDashboard={navigation.navigateDashboard}
          onNavigateHistory={navigation.navigateHistory}
          onNextExercise={workout.selectNextExercise}
          onSaveManualSet={workout.saveSet}
          onSelectExercise={workout.setSelectedExerciseId}
          onSelectWorkoutExercise={workout.selectWorkoutExercise}
          onSetEditChange={workout.updateSetEdit}
          onStartPlannedWorkout={workout.startPlannedWorkout}
          onStartSession={workout.startWorkout}
          onUsePlannedTarget={workout.usePlannedTarget}
          onUseSuggestion={workout.useSuggestion}
          getSetValues={workout.getSetValues}
          getTargetForWorkoutExercise={workout.getTargetForWorkoutExercise}
          suggestion={workout.suggestion}
        />
      )}

      {(navigation.route.name === "history" || navigation.route.name === "historyDetail") && (
        <HistoryView
          history={workoutHistory.history}
          loading={loading}
          selectedItem={workoutHistory.selectedHistoryItem}
          selectedWorkout={workoutHistory.selectedHistoryWorkout}
          session={workout.session}
          onNavigateDashboard={navigation.navigateDashboard}
          onNavigateHistory={navigation.navigateHistory}
          onOpenHistoryItem={workoutHistory.openHistoryItem}
          onStartSession={workout.startWorkout}
        />
      )}
    </main>
  );
}
