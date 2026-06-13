import { PlannedExercise, SmartAutofill } from "./api";

export type SetDraft = {
  weight: string;
  reps: string;
  rpe: string;
};

export type SetEdit = {
  weight: string;
  reps: string;
};

export type AppRoute =
  | { name: "dashboard" }
  | { name: "plan"; planId: number }
  | { name: "session"; planId: number; plannedSessionId: number };

export type PlannedTotals = {
  exercises: number;
  sets: number;
};

export type PreviousByExercise = Record<number, SmartAutofill>;

export const emptyDraft: SetDraft = { weight: "", reps: "", rpe: "" };

export function parseRoute(pathname: string): AppRoute {
  const sessionMatch = pathname.match(/^\/plans\/(\d+)\/sessions\/(\d+)/);
  if (sessionMatch) {
    return {
      name: "session",
      planId: Number(sessionMatch[1]),
      plannedSessionId: Number(sessionMatch[2]),
    };
  }

  const planMatch = pathname.match(/^\/plans\/(\d+)/);
  if (planMatch) return { name: "plan", planId: Number(planMatch[1]) };

  return { name: "dashboard" };
}

export function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = Math.max(0, totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function plannedSetCount(target: PlannedExercise | null): number {
  return Math.max(1, target?.target_sets ?? 1);
}
