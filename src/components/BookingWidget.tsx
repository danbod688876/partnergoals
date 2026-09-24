"use client";

import Script from "next/script";
import { extractResySlug, isFullUrl } from "@/lib/venue-id";
import { BookingButton } from "@/components/BookingButton";
import { OpenTableWidget } from "@/components/OpenTableWidget";

export function BookingWidget({
  platform,
  venueId,
  name,
}: {
  platform: "opentable" | "resy" | "other";
  venueId: string | null;
  name: string;
}) {
  if (platform === "opentable") {
    return <OpenTableWidget venueId={venueId} name={name} />;
  }

  if (!venueId) {
    return (
      <p className="text-sm text-ink-400">
        No booking link on file — add one from the restaurant&rsquo;s edit form, or check their
        website / call directly.
      </p>
    );
  }

  const pastedUrl = isFullUrl(venueId) ? venueId : null;

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
