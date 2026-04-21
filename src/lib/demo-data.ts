import type { FindResponse, Slot } from "./resy-api";

const DINING_TYPES = [
  "Dining Room",
  "Outdoor",
  "Bar",
  "Patio",
  "Private Dining",
  "Counter",
];

const TIMES = [
  "17:00", "17:15", "17:30", "17:45",
  "18:00", "18:15", "18:30", "18:45",
  "19:00", "19:15", "19:30", "19:45",
  "20:00", "20:15", "20:30", "20:45",
  "21:00", "21:15", "21:30",
];

function makeSlot(date: string, time: string, type: string, minSeats: number, maxSeats: number): Slot {
  return {
    config: {
      id: `demo-${time}-${type}`,
      type,
      token: `demo_token_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    },
    date: { start: `${date} ${time}:00`, end: `${date} ${time}:00` },
    size: { min: minSeats, max: maxSeats },
  };
}

function generateSlotPool(date: string): Slot[] {
  const slots: Slot[] = [];
  for (const time of TIMES) {
    const numTypes = 1 + Math.floor(Math.random() * 2);
    const types = DINING_TYPES.sort(() => Math.random() - 0.5).slice(0, numTypes);
    for (const type of types) {
      const isBig = Math.random() > 0.7;
      slots.push(makeSlot(date, time, type, isBig ? 4 : 2, isBig ? 6 : 4));
    }
  }
  return slots;
}

let demoPool: Slot[] = [];
let demoCallCount = 0;
let demoStartTime = 0;

export function resetDemoState() {
  demoPool = [];
  demoCallCount = 0;
  demoStartTime = 0;
}

export function demoFindReservation(
  date: string,
  _partySize: number
): { ok: true; status: 200; data: FindResponse; error: null; duration_ms: number; raw: string } {
  if (demoCallCount === 0) {
    demoStartTime = Date.now();
    demoPool = generateSlotPool(date);
  }
  demoCallCount++;

  const elapsed = Date.now() - demoStartTime;
  const fakeLatency = 40 + Math.floor(Math.random() * 60);

  // First few calls: nothing released yet (simulates pre-window)
  if (demoCallCount <= 3) {
    return {
      ok: true,
      status: 200,
      data: { results: { venues: [{ venue: { id: { resy: 0 }, name: "Demo" }, slots: [] }] } },
      error: null,
      duration_ms: fakeLatency,
      raw: "{}",
    };
  }

  // Simulate slots disappearing over time (popular times go fast)
  let available = [...demoPool];
  if (elapsed > 5000) {
    available = available.filter((s) => {
      const time = s.date.start.split(" ")[1]?.slice(0, 5) ?? "";
      if (["19:00", "19:30", "20:00"].includes(time)) return false;
      return true;
    });
  }
  if (elapsed > 10000) {
    available = available.filter((s) => {
      const time = s.date.start.split(" ")[1]?.slice(0, 5) ?? "";
      if (["18:30", "19:15", "19:45", "20:15", "20:30"].includes(time)) return false;
      return true;
    });
  }
  if (elapsed > 20000) {
    available = available.filter((s) => {
      const time = s.date.start.split(" ")[1]?.slice(0, 5) ?? "";
      if (time >= "18:00" && time <= "21:00") return Math.random() > 0.5;
      return true;
    });
  }

  return {
    ok: true,
    status: 200,
    data: { results: { venues: [{ venue: { id: { resy: 0 }, name: "Demo" }, slots: available }] } },
    error: null,
    duration_ms: fakeLatency,
    raw: "{}",
  };
}

export function demoGetDetails() {
  return {
    ok: true as const,
    status: 200,
    data: {
      book_token: { value: `demo_book_${Date.now()}`, date_expires: new Date(Date.now() + 300000).toISOString() },
      user: { payment_methods: [{ id: 1 }] },
      cancellation: null,
    },
    error: null,
    duration_ms: 30 + Math.floor(Math.random() * 40),
    raw: "{}",
  };
}

export function demoBook() {
  return {
    ok: true as const,
    status: 200,
    data: {
      reservation_id: 900000 + Math.floor(Math.random() * 100000),
      resy_token: `demo_resy_${Date.now()}`,
    },
    error: null,
    duration_ms: 20 + Math.floor(Math.random() * 30),
    raw: "{}",
  };
}
