import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SessionDetailView } from "./SessionDetailView";

const exercise = {
  id: 1,
  name: "Przysiad ze sztangą",
  category: "Siła",
  muscle_group: "Nogi",
  technique_url: null,
};

const plannedExercise = {
  id: 1,
  exercise,
  target_sets: 4,
  target_reps: 8,
  target_weight: 90,
  notes: "Mocno napnij tułów.",
};

const workoutExercise = {
  id: 11,
  order_index: 1,
  exercise,
  sets: [{ id: 101, set_number: 1, weight: 90, reps: 8, rest_seconds: null, rpe: null, completed: false }],
};

describe("SessionDetailView", () => {
  it("renders editable kg and reps inputs and calls complete", () => {
    const onSetEditChange = vi.fn();
    const onCompleteSet = vi.fn();

    render(
      <SessionDetailView
        activeExercise={workoutExercise}
        activePlannedExercise={plannedExercise}
        completedSetCount={0}
        draft={{ weight: "", reps: "", rpe: "" }}
        error={null}
        exercises={[exercise]}
        loading={false}
        plan={{ id: 1, name: "Plan", description: "", created_at: "2026-06-13T00:00:00Z", sessions: [] }}
        plannedSession={{ id: 1, name: "Dzień nóg", order_index: 1, exercises: [plannedExercise] }}
        plannedTotals={{ exercises: 1, sets: 4 }}
        previousByExercise={{}}
        progressPercent={0}
        restRemaining={0}
        selectedExerciseId={1}
        selectedWorkoutExerciseId={11}
        session={{
          id: 1,
          status: "IN_PROGRESS",
          started_at: "2026-06-13T00:00:00Z",
          exercises: [workoutExercise],
        }}
        sessionElapsed={0}
        statusMessage={null}
        summary={null}
        onAddExercise={vi.fn()}
        onApplyPrevious={vi.fn()}
        onCompleteSet={onCompleteSet}
        onCompleteWorkout={vi.fn()}
        onDraftChange={vi.fn()}
        onNavigateDashboard={vi.fn()}
        onNavigateHistory={vi.fn()}
        onSaveManualSet={vi.fn()}
        onSelectExercise={vi.fn()}
        onSelectWorkoutExercise={vi.fn()}
        onNextExercise={vi.fn()}
        onSetEditChange={onSetEditChange}
        onStartPlannedWorkout={vi.fn()}
        onStartSession={vi.fn()}
        onUsePlannedTarget={vi.fn()}
        onUseSuggestion={vi.fn()}
        getSetValues={() => ({ weight: "90", reps: "8" })}
        getTargetForWorkoutExercise={() => plannedExercise}
        suggestion={null}
      />,
    );

    const weight = screen.getByLabelText("Przysiad ze sztangą seria 1 ciężar") as HTMLInputElement;
    const reps = screen.getByLabelText("Przysiad ze sztangą seria 1 powtórzenia") as HTMLInputElement;

    expect(weight.value).toBe("90");
    expect(reps.value).toBe("8");

    fireEvent.change(weight, { target: { value: "92.5" } });
    fireEvent.change(reps, { target: { value: "9" } });
    fireEvent.click(screen.getAllByText("Zapisz")[0]);

    expect(onSetEditChange).toHaveBeenCalled();
    expect(onCompleteSet).toHaveBeenCalled();
  });
});
