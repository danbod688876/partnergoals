// Server-side-only client for SerpApi's Google Hotels engine
// (https://serpapi.com/google-hotels-api, engine=google_hotels). SERP_API_KEY
// must never reach the client — this module is only imported from server
// code (the Planning Session's propose_hotel_stay tool). Returns real
// pricing/rating data; graceful no-op (empty array) when the key is unset or
// the request fails, so a SerpApi outage never breaks a chat turn.

export type HotelCandidate = {
  name: string;
  price: number | null;
  currency: string | null;
  rating: number | null;
  reviewCount: number | null;
  bookingUrl: string | null;
};

type SerpApiRate = {
  lowest?: string;
  extracted_lowest?: number;
};

type SerpApiProperty = {
  name: string;
  rate_per_night?: SerpApiRate;
  total_rate?: SerpApiRate;
  overall_rating?: number;
  reviews?: number;
  link?: string;
  prices?: Array<{ source?: string; link?: string }>;
};

type SerpApiResponse = {
  search_metadata?: { status?: string };
  error?: string;
  properties?: SerpApiProperty[];
};

function apiKey(): string | null {
  return process.env.SERP_API_KEY || null;
}

const MAX_RESULTS = 3;

// 'extracted_lowest' is a plain number; 'lowest' is a formatted string like
// "$210" — pull the currency symbol/code out of that rather than guessing,
// since Google Hotels' currency varies by destination unless overridden via
// the request's own `currency` param (fixed to USD below for consistency).
function parseCurrencySymbol(formatted: string | undefined): string | null {
  if (!formatted) return null;
  const match = formatted.match(/^[^\d]+/);
  return match ? match[0].trim() : null;
}

// Booking link: SerpApi documentation confirms a `serpapi_property_details_link`
// field, but that points back at SerpApi's own API for a follow-up call, not
// a page a user should open. A per-property `link`, and per-source links
// inside `prices` (e.g. a specific OTA's own booking page), are more likely
// to be the user-facing URL but weren't confirmed against a live response
// (no SERP_API_KEY available while building this) — worth checking against
// a real response and adjusting if bookingUrl doesn't land where expected.
// Falls back to a Google Hotels search URL so there's always something to
// click through to.
function resolveBookingUrl(property: SerpApiProperty, destination: string): string {
  const priceLink = property.prices?.find((p) => p.link)?.link;
  if (priceLink) return priceLink;
  if (property.link) return property.link;
  return `https://www.google.com/travel/hotels/${encodeURIComponent(destination)}?q=${encodeURIComponent(property.name)}`;
}

export async function searchHotelsViaSerpApi(params: {
  destination: string;
  checkIn: string;
  checkOut: string;
}): Promise<HotelCandidate[]> {
  const key = apiKey();
  if (!key) return [];

  const { destination, checkIn, checkOut } = params;
  const searchParams = new URLSearchParams({
    engine: "google_hotels",
    q: destination,
    check_in_date: checkIn,
    check_out_date: checkOut,
    currency: "USD",
    api_key: key,
  });

  try {
    const res = await fetch(`https://serpapi.com/search?${searchParams}`);
    if (!res.ok) {
      console.warn(`SerpApi Google Hotels request failed with status ${res.status}`);
      return [];
    }

    const json: SerpApiResponse = await res.json();
    if (json.error || json.search_metadata?.status === "Error") {
      console.warn("SerpApi Google Hotels request failed:", json.error ?? json.search_metadata?.status);
      return [];
    }

    const properties = json.properties ?? [];
    return properties.slice(0, MAX_RESULTS).map((p) => ({
      name: p.name,
      price: p.rate_per_night?.extracted_lowest ?? p.total_rate?.extracted_lowest ?? null,
      currency: parseCurrencySymbol(p.rate_per_night?.lowest) ?? "USD",
      rating: p.overall_rating ?? null,
      reviewCount: p.reviews ?? null,
      bookingUrl: resolveBookingUrl(p, destination),
    }));
  } catch (err) {
    console.warn("SerpApi Google Hotels request failed:", err);
    return [];
  }
}
