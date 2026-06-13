import { useEffect, useMemo, useState } from "react";

export function useTimers() {
  const [now, setNow] = useState(Date.now());
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const sessionElapsed = useMemo(
    () => (sessionStartedAt ? Math.floor((now - sessionStartedAt) / 1000) : 0),
    [now, sessionStartedAt],
  );

  const restRemaining = useMemo(
    () => (restEndsAt ? Math.max(0, Math.ceil((restEndsAt - now) / 1000)) : 0),
    [now, restEndsAt],
  );

  function setWorkoutStartedAt(value: string | number | null) {
    if (value == null) {
      setSessionStartedAt(null);
      return;
    }

    const timestamp = typeof value === "number" ? value : new Date(value).getTime();
    setSessionStartedAt(Number.isFinite(timestamp) ? timestamp : Date.now());
  }

  function startRestTimer(seconds = 90) {
    setRestEndsAt(Date.now() + seconds * 1000);
  }

  return {
    clearRestTimer: () => setRestEndsAt(null),
    restRemaining,
    sessionElapsed,
    setWorkoutStartedAt,
    startRestTimer,
  };
}
