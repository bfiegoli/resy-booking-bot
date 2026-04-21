import http from "node:http";
import https from "node:https";

const BASE_URL = "https://api.resy.com";

// Persistent agent with keep-alive for connection reuse (skip TLS handshake)
const keepAliveAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 10,
});

// Patch globalThis.fetch to use keep-alive via undici/node internals
// Node 18+ fetch uses undici internally which handles keep-alive by default,
// but we set the Connection header explicitly to be safe
const HEADERS = {
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  dnt: "1",
  accept: "application/json, text/plain, */*",
  "cache-control": "no-cache",
  referer: "https://widgets.resy.com/",
  origin: "https://widgets.resy.com/",
  connection: "keep-alive",
};

function authHeaders(apiKey: string, authToken?: string) {
  const h: Record<string, string> = {
    ...HEADERS,
    Authorization: `ResyAPI api_key="${apiKey}"`,
  };
  if (authToken) h["x-resy-auth-token"] = authToken;
  return h;
}

export type ApiCallResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  duration_ms: number;
  raw: string;
};

async function apiCall<T>(
  url: string,
  options: RequestInit,
  label: string
): Promise<ApiCallResult<T>> {
  const start = performance.now();
  try {
    const res = await fetch(url, options);
    const duration_ms = Math.round(performance.now() - start);
    const raw = await res.text();
    let data: T | null = null;
    try {
      data = JSON.parse(raw);
    } catch {}

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data,
        error: `${label}: HTTP ${res.status} - ${raw.slice(0, 500)}`,
        duration_ms,
        raw,
      };
    }
    return { ok: true, status: res.status, data, error: null, duration_ms, raw };
  } catch (err: unknown) {
    const duration_ms = Math.round(performance.now() - start);
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      status: 0,
      data: null,
      error: `${label}: Network error - ${msg}`,
      duration_ms,
      raw: "",
    };
  }
}

// --- Auth ---

export type AuthResponse = {
  id: number;
  first_name: string;
  last_name: string;
  token: string;
  payment_method_id?: number;
  em_address: string;
};

export async function login(
  apiKey: string,
  email: string,
  password: string
): Promise<ApiCallResult<AuthResponse>> {
  const body = new URLSearchParams({ email, password });
  return apiCall<AuthResponse>(
    `${BASE_URL}/3/auth/password`,
    {
      method: "POST",
      headers: {
        ...authHeaders(apiKey),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    },
    "auth/password"
  );
}

// --- Venue Search ---

export type VenueSearchHit = {
  name: string;
  id: { resy: number };
  neighborhood: string;
  locality: string;
  cuisine: string[];
  images: string[];
  url_slug: string;
  max_party_size: number;
  rating: { count: number; average: number };
  price_range_id: number;
  _geoloc: { lat: number; lng: number };
  content: Array<{ name: string; body: string }>;
};

export type VenueSearchResponse = {
  search: { nbHits: number; hits: VenueSearchHit[] };
};

export async function searchVenues(
  apiKey: string,
  query: string,
  perPage = 10
): Promise<ApiCallResult<VenueSearchResponse>> {
  return apiCall<VenueSearchResponse>(
    `${BASE_URL}/3/venuesearch/search`,
    {
      method: "POST",
      headers: {
        ...authHeaders(apiKey),
        "content-type": "application/json",
      },
      body: JSON.stringify({ query, per_page: perPage, types: ["venue"] }),
    },
    "venuesearch/search"
  );
}

// --- Venue Config (lead time) ---

export type VenueConfigResponse = {
  lead_time_in_days: number;
  [key: string]: unknown;
};

export async function getVenueConfig(
  apiKey: string,
  authToken: string,
  venueId: number
): Promise<ApiCallResult<VenueConfigResponse>> {
  const params = new URLSearchParams({ venue_id: String(venueId) });
  return apiCall<VenueConfigResponse>(
    `${BASE_URL}/2/config?${params}`,
    { method: "GET", headers: authHeaders(apiKey, authToken) },
    "config"
  );
}

// --- Venue Details (timezone) ---

export type VenueDetailsResponse = {
  locale?: { currency: string; time_zone: string };
  name?: string;
  [key: string]: unknown;
};

export async function getVenueDetails(
  apiKey: string,
  authToken: string,
  venueId: number
): Promise<ApiCallResult<VenueDetailsResponse>> {
  return apiCall<VenueDetailsResponse>(
    `${BASE_URL}/3/venue?id=${venueId}`,
    { method: "GET", headers: authHeaders(apiKey, authToken) },
    "venue"
  );
}

// --- Find Reservation ---

export type Slot = {
  config: { id: string; type: string; token: string };
  date: { start: string; end: string };
  size: { min: number; max: number };
  payment?: { cancellation_fee: number | null; deposit_fee: number | null };
};

export type FindResponse = {
  results: {
    venues: Array<{
      venue: { id: { resy: number }; name: string };
      slots: Slot[];
    }>;
  };
};

export async function findReservation(
  apiKey: string,
  authToken: string,
  venueId: number,
  date: string,
  partySize: number
): Promise<ApiCallResult<FindResponse>> {
  const params = new URLSearchParams({
    venue_id: String(venueId),
    day: date,
    party_size: String(partySize),
    lat: "0",
    long: "0",
  });
  return apiCall<FindResponse>(
    `${BASE_URL}/4/find?${params}`,
    { method: "GET", headers: authHeaders(apiKey, authToken) },
    "find"
  );
}

// --- Reservation Details ---

export type DetailsResponse = {
  book_token: { value: string; date_expires: string };
  user: { payment_methods: Array<{ id: number }> };
  cancellation: unknown;
};

export async function getReservationDetails(
  apiKey: string,
  authToken: string,
  configId: string,
  date: string,
  partySize: number
): Promise<ApiCallResult<DetailsResponse>> {
  const params = new URLSearchParams({
    config_id: configId,
    day: date,
    party_size: String(partySize),
  });
  return apiCall<DetailsResponse>(
    `${BASE_URL}/3/details?${params}`,
    { method: "GET", headers: authHeaders(apiKey, authToken) },
    "details"
  );
}

// --- Book Reservation ---

export type BookResponse = {
  reservation_id: number;
  resy_token: string;
  [key: string]: unknown;
};

export async function bookReservation(
  apiKey: string,
  authToken: string,
  bookToken: string,
  paymentMethodId?: number
): Promise<ApiCallResult<BookResponse>> {
  const params: Record<string, string> = {
    book_token: bookToken,
    source_id: "resy.com-venue-details",
  };
  if (paymentMethodId) {
    params.struct_payment_method = JSON.stringify({ id: paymentMethodId });
  }
  const body = new URLSearchParams(params);
  return apiCall<BookResponse>(
    `${BASE_URL}/3/book`,
    {
      method: "POST",
      headers: {
        ...authHeaders(apiKey, authToken),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    },
    "book"
  );
}
