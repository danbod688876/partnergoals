"use client";

import Script from "next/script";

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

// OpenTable's stable "restref" redirect — takes a numeric restaurant id
// straight to that restaurant's own booking page. Long-standing, documented
// URL scheme used by OpenTable's own widget generator output.
function openTableFallbackUrl(venueId: string): string {
  return `https://www.opentable.com/restref/client/?rid=${encodeURIComponent(venueId)}`;
}

// OpenTable's iframe-mode reservation widget loader. Verify against
// OpenTable's current widget generator (opentable.com/restref/widgets) if
// this ever stops rendering — third-party embed syntax can drift and this
// couldn't be confirmed live while building this feature.
function openTableIframeUrl(venueId: string): string {
  const params = new URLSearchParams({
    rid: venueId,
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

  if (isUrl(venueId)) {
    return <BookingButton href={venueId} label="Reserve" />;
  }

  if (platform === "opentable") {
    return (
      <div className="space-y-3">
        <iframe
          src={openTableIframeUrl(venueId)}
          title={`OpenTable reservations for ${name}`}
          className="w-full rounded-xl2 border border-ink-100"
          style={{ height: 700 }}
        />
        <BookingButton href={openTableFallbackUrl(venueId)} label="Open on OpenTable" />
      </div>
    );
  }

  if (platform === "resy") {
    return (
      <div className="space-y-3">
        {/* Resy's public button-widget embed. Verify against Resy's current
            widget docs if this doesn't render — couldn't confirm the exact
            data-attribute names live while building this feature, hence the
            search fallback below, which always works. */}
        <div data-resy-button-widget="true" data-resy-venue-id={venueId} />
        <Script src="https://widgets.resy.com/embed.js" strategy="lazyOnload" />
        <BookingButton
          href={`https://resy.com/search?q=${encodeURIComponent(name)}`}
          label={`Find ${name} on Resy`}
        />
      </div>
    );
  }

  return (
    <p className="text-sm text-ink-400">
      No online booking set up for this platform — call or check their website.
    </p>
  );
}
