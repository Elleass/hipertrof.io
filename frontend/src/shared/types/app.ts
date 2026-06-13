import { SmartAutofill } from "../api/client";

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
  | { name: "session"; planId: number; plannedSessionId: number }
  | { name: "history" }
  | { name: "historyDetail"; sessionId: number };

export type PlannedTotals = {
  exercises: number;
  sets: number;
};

export type PreviousByExercise = Record<number, SmartAutofill>;

export const emptyDraft: SetDraft = { weight: "", reps: "", rpe: "" };

export function parseRoute(pathname: string): AppRoute {
  const historyMatch = pathname.match(/^\/history\/(\d+)/);
  if (historyMatch) return { name: "historyDetail", sessionId: Number(historyMatch[1]) };
  if (pathname === "/history") return { name: "history" };

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
