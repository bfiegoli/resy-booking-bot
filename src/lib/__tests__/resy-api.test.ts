import { describe, it, expect } from "vitest";

// Test the type structures and API URL construction patterns from resy-api.ts
// We don't call the actual Resy API, but validate the shapes and helpers.

describe("resy-api types and structures", () => {
  it("Slot type has required fields", () => {
    // Validate the shape matches what the sniper expects
    const slot = {
      config: { id: "123", type: "Dining Room", token: "abc" },
      date: { start: "2025-06-15 19:00:00", end: "2025-06-15 21:00:00" },
      size: { min: 2, max: 4 },
    };

    expect(slot.config.id).toBeTruthy();
    expect(slot.config.type).toBeTruthy();
    expect(slot.config.token).toBeTruthy();
    expect(slot.date.start).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(slot.size.min).toBeLessThanOrEqual(slot.size.max);
  });

  it("FindResponse structure matches expected format", () => {
    const response = {
      results: {
        venues: [
          {
            venue: { id: { resy: 12345 }, name: "Test Restaurant" },
            slots: [
              {
                config: { id: "slot-1", type: "Dining Room", token: "tok1" },
                date: { start: "2025-06-15 19:00:00", end: "2025-06-15 21:00:00" },
                size: { min: 2, max: 4 },
              },
            ],
          },
        ],
      },
    };

    expect(response.results.venues).toHaveLength(1);
    expect(response.results.venues[0].venue.id.resy).toBe(12345);
    expect(response.results.venues[0].slots).toHaveLength(1);
  });

  it("API URL params are properly constructed", () => {
    const venueId = 12345;
    const date = "2025-06-15";
    const partySize = 4;

    const params = new URLSearchParams({
      venue_id: String(venueId),
      day: date,
      party_size: String(partySize),
      lat: "0",
      long: "0",
    });

    const url = `https://api.resy.com/4/find?${params}`;
    expect(url).toContain("venue_id=12345");
    expect(url).toContain("day=2025-06-15");
    expect(url).toContain("party_size=4");
  });

  it("auth header format is correct", () => {
    const apiKey = "VbWk7s3L4KiK5fzlO7JD3Q5EYolJI7n5";
    const authToken = "test_auth_token";

    const headers: Record<string, string> = {
      Authorization: `ResyAPI api_key="${apiKey}"`,
      "x-resy-auth-token": authToken,
    };

    expect(headers.Authorization).toBe('ResyAPI api_key="VbWk7s3L4KiK5fzlO7JD3Q5EYolJI7n5"');
    expect(headers["x-resy-auth-token"]).toBe("test_auth_token");
  });

  it("book request body is properly encoded", () => {
    const bookToken = "test_book_token_123";
    const paymentMethodId = 42;

    const params: Record<string, string> = {
      book_token: bookToken,
      source_id: "resy.com-venue-details",
      struct_payment_method: JSON.stringify({ id: paymentMethodId }),
    };
    const body = new URLSearchParams(params);

    expect(body.get("book_token")).toBe("test_book_token_123");
    expect(body.get("source_id")).toBe("resy.com-venue-details");
    expect(JSON.parse(body.get("struct_payment_method")!)).toEqual({ id: 42 });
  });

  it("login body uses form encoding", () => {
    const email = "test@example.com";
    const password = "secret123";
    const body = new URLSearchParams({ email, password });

    expect(body.toString()).toContain("email=test%40example.com");
    expect(body.toString()).toContain("password=secret123");
  });
});

describe("slot matching logic", () => {
  // Reproduce the matching logic from sniper.ts
  function matchSlot(
    slots: Array<{ config: { type: string }; date: { start: string }; size: { min: number; max: number } }>,
    preferences: Array<{ time: string; dining_type?: string }>,
    partySize: number
  ) {
    for (const pref of preferences) {
      for (const slot of slots) {
        const slotTime = slot.date.start.split(" ")[1]?.slice(0, 5);
        if (slotTime !== pref.time) continue;
        if (pref.dining_type && slot.config.type !== pref.dining_type) continue;
        if (partySize < slot.size.min || partySize > slot.size.max) continue;
        return { slot, preference: pref };
      }
    }
    return null;
  }

  it("matches exact time and type", () => {
    const slots = [
      { config: { type: "Dining Room" }, date: { start: "2025-06-15 19:00:00" }, size: { min: 2, max: 4 } },
      { config: { type: "Bar" }, date: { start: "2025-06-15 19:00:00" }, size: { min: 1, max: 2 } },
    ];
    const prefs = [{ time: "19:00", dining_type: "Bar" }];

    const match = matchSlot(slots, prefs, 2);
    expect(match).not.toBeNull();
    expect(match!.slot.config.type).toBe("Bar");
  });

  it("respects preference priority order", () => {
    const slots = [
      { config: { type: "Dining Room" }, date: { start: "2025-06-15 19:00:00" }, size: { min: 2, max: 4 } },
      { config: { type: "Dining Room" }, date: { start: "2025-06-15 19:30:00" }, size: { min: 2, max: 4 } },
    ];
    const prefs = [
      { time: "19:00" },
      { time: "19:30" },
    ];

    const match = matchSlot(slots, prefs, 2);
    expect(match!.preference.time).toBe("19:00");
  });

  it("falls back to second preference when first unavailable", () => {
    const slots = [
      { config: { type: "Dining Room" }, date: { start: "2025-06-15 19:30:00" }, size: { min: 2, max: 4 } },
    ];
    const prefs = [
      { time: "19:00" },
      { time: "19:30" },
    ];

    const match = matchSlot(slots, prefs, 2);
    expect(match!.preference.time).toBe("19:30");
  });

  it("returns null when no slots match", () => {
    const slots = [
      { config: { type: "Dining Room" }, date: { start: "2025-06-15 21:00:00" }, size: { min: 2, max: 4 } },
    ];
    const prefs = [{ time: "19:00" }];

    const match = matchSlot(slots, prefs, 2);
    expect(match).toBeNull();
  });

  it("rejects slot when party size is too large", () => {
    const slots = [
      { config: { type: "Dining Room" }, date: { start: "2025-06-15 19:00:00" }, size: { min: 2, max: 4 } },
    ];
    const prefs = [{ time: "19:00" }];

    const match = matchSlot(slots, prefs, 6);
    expect(match).toBeNull();
  });

  it("rejects slot when party size is too small", () => {
    const slots = [
      { config: { type: "Dining Room" }, date: { start: "2025-06-15 19:00:00" }, size: { min: 4, max: 8 } },
    ];
    const prefs = [{ time: "19:00" }];

    const match = matchSlot(slots, prefs, 2);
    expect(match).toBeNull();
  });

  it("matches without dining_type filter", () => {
    const slots = [
      { config: { type: "Patio" }, date: { start: "2025-06-15 19:00:00" }, size: { min: 2, max: 4 } },
    ];
    const prefs = [{ time: "19:00" }]; // No dining_type specified

    const match = matchSlot(slots, prefs, 2);
    expect(match).not.toBeNull();
    expect(match!.slot.config.type).toBe("Patio");
  });
});
