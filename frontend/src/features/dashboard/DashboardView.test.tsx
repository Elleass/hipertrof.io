import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardView } from "./DashboardView";

const plan = {
  id: 1,
  name: "Baza hipertrofii",
  description: "Prosty trzydniowy split",
  created_at: "2026-06-13T00:00:00Z",
  sessions: [
    {
      id: 1,
      name: "Dzień nóg",
      order_index: 1,
      exercises: [],
    },
  ],
};

describe("DashboardView", () => {
  it("renders available training plans", () => {
    render(
      <DashboardView
        error={null}
        loading={false}
        plans={[plan]}
        session={null}
        stats={{ completed_workouts: 0, total_tonnage: 0, personal_records: {}, achievements: [] }}
        tonnage={0}
        onOpenPlan={vi.fn()}
        onNavigateDashboard={vi.fn()}
        onNavigateHistory={vi.fn()}
        onStartSession={vi.fn()}
      />,
    );

    expect(screen.getByText("Baza hipertrofii")).toBeTruthy();
    expect(screen.getByText("Wejdź w plan")).toBeTruthy();
  });
});
