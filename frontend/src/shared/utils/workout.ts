import { PlannedExercise, SmartAutofill } from "../api/client";
import { WorkoutSession } from "../api/client";

export function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = Math.max(0, totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function plannedSetCount(target: PlannedExercise | null): number {
  return Math.max(1, target?.target_sets ?? 1);
}

export function previousSetValue(previous: SmartAutofill | undefined, setNumber: number) {
  return previous?.suggested_sets.find((item) => item.set_number === setNumber);
}

export function formatWorkoutStatus(status: WorkoutSession["status"] | "READY"): string {
  const labels: Record<WorkoutSession["status"] | "READY", string> = {
    PLANNED: "Zaplanowany",
    IN_PROGRESS: "W trakcie",
    PAUSED: "Wstrzymany",
    COMPLETED: "Ukończony",
    CANCELLED: "Anulowany",
    MISSED: "Pominięty",
    READY: "Gotowy",
  };
  return labels[status];
}
