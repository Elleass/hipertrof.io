import { useEffect, useState } from "react";
import { AppRoute, parseRoute } from "../types/app";

export function useWorkoutNavigation() {
  const [route, setRoute] = useState<AppRoute>(() => parseRoute(window.location.pathname));

  useEffect(() => {
    const onPopState = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function navigate(path: string) {
    window.history.pushState({}, "", path);
    setRoute(parseRoute(path));
  }

  return {
    route,
    navigate,
    navigateDashboard: () => navigate("/"),
    navigateHistory: () => navigate("/history"),
  };
}
