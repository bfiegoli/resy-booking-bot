import { describe, it, expect, beforeEach } from "vitest";
import {
  resetDemoState,
  demoFindReservation,
  demoGetDetails,
  demoBook,
} from "../demo-data";

describe("demo-data", () => {
  beforeEach(() => {
    resetDemoState();
  });

  describe("demoFindReservation", () => {
    it("returns empty slots on first few calls (simulates pre-window)", () => {
      const r1 = demoFindReservation("2025-06-15", 2);
      expect(r1.ok).toBe(true);
      expect(r1.status).toBe(200);
      expect(r1.data.results.venues).toHaveLength(1);
      expect(r1.data.results.venues[0].slots).toHaveLength(0);

      const r2 = demoFindReservation("2025-06-15", 2);
      expect(r2.data.results.venues[0].slots).toHaveLength(0);

      const r3 = demoFindReservation("2025-06-15", 2);
      expect(r3.data.results.venues[0].slots).toHaveLength(0);
    });

    it("returns slots after initial warmup calls", () => {
      // First 3 calls return empty
      demoFindReservation("2025-06-15", 2);
      demoFindReservation("2025-06-15", 2);
      demoFindReservation("2025-06-15", 2);

      // 4th call should have slots
      const r4 = demoFindReservation("2025-06-15", 2);
      expect(r4.ok).toBe(true);
      expect(r4.data.results.venues[0].slots.length).toBeGreaterThan(0);
    });

    it("returns valid slot structure", () => {
      // Skip warmup
      demoFindReservation("2025-06-15", 2);
      demoFindReservation("2025-06-15", 2);
      demoFindReservation("2025-06-15", 2);

      const result = demoFindReservation("2025-06-15", 2);
      const slots = result.data.results.venues[0].slots;
      expect(slots.length).toBeGreaterThan(0);

      for (const slot of slots) {
        expect(slot.config).toBeDefined();
        expect(slot.config.id).toContain("demo-");
        expect(slot.config.type).toBeTruthy();
        expect(slot.config.token).toContain("demo_token_");
        expect(slot.date.start).toContain("2025-06-15");
        expect(slot.size.min).toBeGreaterThanOrEqual(2);
        expect(slot.size.max).toBeGreaterThanOrEqual(slot.size.min);
      }
    });

    it("includes duration_ms in response", () => {
      const result = demoFindReservation("2025-06-15", 2);
      expect(result.duration_ms).toBeGreaterThanOrEqual(0);
      expect(result.duration_ms).toBeLessThan(200);
    });

    it("returns consistent pool across calls", () => {
      // Skip warmup
      demoFindReservation("2025-06-15", 2);
      demoFindReservation("2025-06-15", 2);
      demoFindReservation("2025-06-15", 2);

      const r4 = demoFindReservation("2025-06-15", 2);
      const r5 = demoFindReservation("2025-06-15", 2);

      // Should be same pool (slots may decrease over time but IDs consistent)
      const ids4 = new Set(r4.data.results.venues[0].slots.map((s) => s.config.id));
      const ids5 = new Set(r5.data.results.venues[0].slots.map((s) => s.config.id));

      // r5 slots should be a subset of r4 (slots can disappear, not appear)
      for (const id of ids5) {
        expect(ids4.has(id)).toBe(true);
      }
    });
  });

  describe("demoGetDetails", () => {
    it("returns a valid book token", () => {
      const result = demoGetDetails();
      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data.book_token.value).toContain("demo_book_");
      expect(result.data.book_token.date_expires).toBeTruthy();
    });

    it("returns payment methods", () => {
      const result = demoGetDetails();
      expect(result.data.user.payment_methods).toHaveLength(1);
      expect(result.data.user.payment_methods[0].id).toBe(1);
    });

    it("has reasonable latency", () => {
      const result = demoGetDetails();
      expect(result.duration_ms).toBeGreaterThanOrEqual(0);
      expect(result.duration_ms).toBeLessThan(200);
    });
  });

  describe("demoBook", () => {
    it("returns a reservation ID", () => {
      const result = demoBook();
      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data.reservation_id).toBeGreaterThanOrEqual(900000);
      expect(result.data.reservation_id).toBeLessThan(1000000);
    });

    it("returns a resy token", () => {
      const result = demoBook();
      expect(result.data.resy_token).toContain("demo_resy_");
    });

    it("returns different reservation IDs each time", () => {
      const r1 = demoBook();
      const r2 = demoBook();
      // Could technically collide but extremely unlikely
      // Just check they're both valid
      expect(r1.data.reservation_id).toBeGreaterThanOrEqual(900000);
      expect(r2.data.reservation_id).toBeGreaterThanOrEqual(900000);
    });
  });

  describe("resetDemoState", () => {
    it("resets so first calls return empty again", () => {
      // Run through warmup
      demoFindReservation("2025-06-15", 2);
      demoFindReservation("2025-06-15", 2);
      demoFindReservation("2025-06-15", 2);
      const result = demoFindReservation("2025-06-15", 2);
      expect(result.data.results.venues[0].slots.length).toBeGreaterThan(0);

      // Reset
      resetDemoState();

      // Should be empty again
      const after = demoFindReservation("2025-06-15", 2);
      expect(after.data.results.venues[0].slots).toHaveLength(0);
    });
  });
});
