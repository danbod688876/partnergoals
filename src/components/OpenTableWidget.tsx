"use client";

import { useEffect, useRef } from "react";
import { extractOpenTableRid, isFullUrl } from "@/lib/venue-id";
import { BookingButton } from "@/components/BookingButton";

// OpenTable's stable "restref" redirect — takes a numeric restaurant id
// straight to that restaurant's own booking page. Long-standing, documented
// URL scheme used by OpenTable's own widget generator output.
function openTableFallbackUrl(rid: string): string {
  return `https://www.opentable.com/restref/client/?rid=${encodeURIComponent(rid)}`;
}

// OpenTable's current reservation widget loader (verified against a real
// installed embed's source, Sept 2026 — OpenTable's own widget-generator
// page is a JS-gated dashboard behind login, not fetchable directly). No API
// key or partner approval needed: any restaurant generates this from their
// own "OpenTable for Restaurants" account. The real markup is
// `<div id="reservation"><script src="...loader?rid=...">...` — the loader
// writes its iframe into that div, so the script must be a literal DOM child
// of the target container (done via the effect below), not just loaded
// anywhere on the page the way a normal async script tag would be.
function openTableLoaderSrc(rid: string): string {
  const params = new URLSearchParams({
    rid,
    type: "standard",
    theme: "tall",
    iframe: "true",
    overlay: "false",
    domain: "com",
    lang: "en-US",
  });
  return `https://www.opentable.com/widget/reservation/loader?${params}`;
}

// Reusable OpenTable reservation widget. venueId may be a bare numeric rid
// (as stored from the restaurant's edit form) or a full pasted OpenTable URL
// — either works. Falls back to a plain outbound link when there's nothing
// to embed, or when a pasted URL doesn't carry an extractable ?rid=.
export function OpenTableWidget({ venueId, name }: { venueId: string | null; name: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const pastedUrl = venueId && isFullUrl(venueId) ? venueId : null;
  const rid = venueId ? (pastedUrl ? extractOpenTableRid(pastedUrl) : venueId) : null;

  useEffect(() => {
    const container = containerRef.current;
    if (!rid || !container) return;

    container.innerHTML = "";
    const script = document.createElement("script");
    script.src = openTableLoaderSrc(rid);
    script.async = true;
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [rid]);

  if (!venueId) {
    return (
      <p className="text-sm text-ink-400">
        No booking link on file — add one from the restaurant&rsquo;s edit form, or check their
        website / call directly.
      </p>
    );
  }

  if (!rid) {
    // A full URL was pasted but doesn't carry a ?rid= we can extract (e.g. a
    // bare /r/slug link) — link out directly rather than guessing.
    return <BookingButton href={pastedUrl ?? venueId} label="Reserve" />;
  }

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        aria-label={`OpenTable reservations for ${name}`}
        className="min-h-[420px] overflow-hidden rounded-xl2 border border-ink-100 bg-cream-50"
      />
      <BookingButton href={openTableFallbackUrl(rid)} label="Open on OpenTable" />
    </div>
  );
}
