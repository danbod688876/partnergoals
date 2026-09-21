"use client";

import Script from "next/script";
import { extractOpenTableRid, extractResySlug, isFullUrl } from "@/lib/venue-id";

// OpenTable's stable "restref" redirect — takes a numeric restaurant id
// straight to that restaurant's own booking page. Long-standing, documented
// URL scheme used by OpenTable's own widget generator output.
function openTableFallbackUrl(rid: string): string {
  return `https://www.opentable.com/restref/client/?rid=${encodeURIComponent(rid)}`;
}

// OpenTable's iframe-mode reservation widget loader. Verify against
// OpenTable's current widget generator (opentable.com/restref/widgets) if
// this ever stops rendering — third-party embed syntax can drift and this
// couldn't be confirmed live while building this feature.
function openTableIframeUrl(rid: string): string {
  const params = new URLSearchParams({
    rid,
    type: "standard",
    theme: "standard",
    iframe: "true",
  });
  return `https://www.opentable.com/widget/reservation/loader?${params}`;
}

function BookingButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg bg-clay-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-clay-600"
    >
      {label}
      <span aria-hidden>↗</span>
    </a>
  );
}

export function BookingWidget({
  platform,
  venueId,
  name,
}: {
  platform: "opentable" | "resy" | "other";
  venueId: string | null;
  name: string;
}) {
  if (!venueId) {
    return (
      <p className="text-sm text-ink-400">
        No booking link on file — add one from the restaurant&rsquo;s edit form, or check their
        website / call directly.
      </p>
    );
  }

  const pastedUrl = isFullUrl(venueId) ? venueId : null;

  if (platform === "opentable") {
    // Either a bare rid was stored, or a full URL was — parse the rid out
    // of it so the widget still embeds instead of just linking out.
    const rid = pastedUrl ? extractOpenTableRid(pastedUrl) : venueId;

    if (rid) {
      return (
        <div className="space-y-3">
          <iframe
            src={openTableIframeUrl(rid)}
            title={`OpenTable reservations for ${name}`}
            className="w-full rounded-xl2 border border-ink-100"
            style={{ height: 700 }}
          />
          <BookingButton href={openTableFallbackUrl(rid)} label="Open on OpenTable" />
        </div>
      );
    }

    // A full URL was pasted but it doesn't carry a ?rid= we can extract
    // (e.g. a bare /r/slug link) — link out directly rather than guessing.
    return <BookingButton href={pastedUrl ?? venueId} label="Reserve" />;
  }

  if (platform === "resy") {
    const slug = pastedUrl ? extractResySlug(pastedUrl) : venueId;

    if (slug) {
      return (
        <div className="space-y-3">
          {/* Resy's public button-widget embed. Verify against Resy's current
              widget docs if this doesn't render — couldn't confirm the exact
              data-attribute names live while building this feature, hence the
              search fallback below, which always works. */}
          <div data-resy-button-widget="true" data-resy-venue-id={slug} />
          <Script src="https://widgets.resy.com/embed.js" strategy="lazyOnload" />
          <BookingButton
            href={pastedUrl ?? `https://resy.com/search?q=${encodeURIComponent(name)}`}
            label={pastedUrl ? "Open on Resy" : `Find ${name} on Resy`}
          />
        </div>
      );
    }

    return (
      <BookingButton
        href={pastedUrl ?? `https://resy.com/search?q=${encodeURIComponent(name)}`}
        label={pastedUrl ? "Open on Resy" : `Find ${name} on Resy`}
      />
    );
  }

  // No widget for "other" platforms — a pasted URL becomes a plain link,
  // otherwise there's nothing to act on.
  if (pastedUrl) {
    return <BookingButton href={pastedUrl} label="View restaurant" />;
  }

  return (
    <p className="text-sm text-ink-400">
      No online booking set up for this platform — call or check their website.
    </p>
  );
}
