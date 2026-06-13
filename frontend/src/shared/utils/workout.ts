import { PlannedExercise, SmartAutofill } from "../api/client";

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
