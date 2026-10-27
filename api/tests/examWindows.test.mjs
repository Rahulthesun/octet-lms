import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

let windowState;
beforeAll(() => {
  process.env.SUPABASE_URL ||= "http://localhost:54321";
  process.env.SUPABASE_SERVICE_KEY ||= "test";
  process.env.SUPABASE_KEY ||= "test";
  process.env.R2_PUBLIC_URL ||= "https://files.example.com";
  ({ windowState } = require("../services/examDocuments.service"));
});

describe("exam document windows", () => {
  const event = { exam_date: "2026-10-30", hall_ticket_opened_at: null, results_opened_at: null };

  it("is not open until the admin opens it", () => {
    expect(windowState(event, "HALL_TICKET", "2026-10-28")).toBe("not_open");
    expect(windowState(event, "MARKSHEET", "2026-11-05")).toBe("not_open");
  });

  it("keeps the hall ticket open through the exam date, then closes it", () => {
    const opened = { ...event, hall_ticket_opened_at: "2026-10-20T05:00:00Z" };
    expect(windowState(opened, "HALL_TICKET", "2026-10-30")).toBe("open");
    expect(windowState(opened, "HALL_TICKET", "2026-10-31")).toBe("closed");
  });

  it("closes the marksheet 30 days after results open", () => {
    const opened = { ...event, results_opened_at: "2026-11-01T05:00:00Z" };
    expect(windowState(opened, "MARKSHEET", "2026-12-01")).toBe("open");
    expect(windowState(opened, "MARKSHEET", "2026-12-02")).toBe("closed");
  });
});
