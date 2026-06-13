const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export type Exercise = {
  id: number;
  name: string;
  category: string;
  muscle_group: string;
  technique_url?: string | null;
};

export type WorkoutSet = {
  id: number;
  set_number: number;
  weight: number;
  reps: number;
  rest_seconds?: number | null;
  rpe?: number | null;
  completed: boolean;
};

export type WorkoutExercise = {
  id: number;
  order_index: number;
  exercise: Exercise;
  sets: WorkoutSet[];
};

export type WorkoutSession = {
  id: number;
  plan_id?: number | null;
  planned_session_id?: number | null;
  status: "PLANNED" | "IN_PROGRESS" | "PAUSED" | "COMPLETED" | "CANCELLED" | "MISSED";
  started_at: string;
  completed_at?: string | null;
  notes?: string | null;
  exercises: WorkoutExercise[];
};

export type PlannedExercise = {
  id: number;
  exercise: Exercise;
  target_sets?: number | null;
  target_reps?: number | null;
  target_weight?: number | null;
  notes?: string | null;
};

export type PlannedSession = {
  id: number;
  name: string;
  scheduled_date?: string | null;
  order_index: number;
  exercises: PlannedExercise[];
};

export type WorkoutPlan = {
  id: number;
  name: string;
  description?: string | null;
  created_at: string;
  sessions: PlannedSession[];
};

export type WorkoutSummary = {
  session: WorkoutSession;
  tonnage: number;
  completed_sets: number;
};

export type SmartAutofill = {
  exercise_id: number;
  suggested_weight?: number | null;
  suggested_reps?: number | null;
  source_session_id?: number | null;
  source_date?: string | null;
};

export type StatisticsSummary = {
  completed_workouts: number;
  total_tonnage: number;
  personal_records: Record<string, number>;
  achievements: string[];
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(body.detail ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export const api = {
  exercises: () => request<Exercise[]>("/exercises"),
  plans: () => request<WorkoutPlan[]>("/plans"),
  stats: () => request<StatisticsSummary>("/statistics/summary"),
  startWorkout: (payload?: { notes?: string; plan_id?: number; planned_session_id?: number }) =>
    request<WorkoutSession>("/workout-sessions/start", {
      method: "POST",
      body: JSON.stringify(payload ?? { notes: "Ad-hoc strength workout" }),
    }),
  getWorkout: (id: number) => request<WorkoutSession>(`/workout-sessions/${id}`),
  addExercise: (sessionId: number, exerciseId: number) =>
    request<WorkoutExercise>(`/workout-sessions/${sessionId}/exercises`, {
      method: "POST",
      body: JSON.stringify({ exercise_id: exerciseId }),
    }),
  smartAutofill: (exerciseId: number) => request<SmartAutofill>(`/smart-autofill?exercise_id=${exerciseId}`),
  addSet: (workoutExerciseId: number, payload: { weight: number; reps: number; rpe?: number | null; completed?: boolean }) =>
    request<WorkoutSet>(`/workout-exercises/${workoutExerciseId}/sets`, {
      method: "POST",
      body: JSON.stringify({ ...payload, completed: true }),
    }),
  updateSet: (
    setId: number,
    payload: { weight?: number; reps?: number; rpe?: number | null; completed?: boolean },
  ) =>
    request<WorkoutSet>(`/workout-sets/${setId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  completeWorkout: (sessionId: number) =>
    request<WorkoutSummary>(`/workout-sessions/${sessionId}/complete`, {
      method: "POST",
    }),
};
