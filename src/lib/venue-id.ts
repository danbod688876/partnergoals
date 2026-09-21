// Pulls the platform-specific booking ID/slug out of a full restaurant page
// URL, so a pasted URL can still drive the embedded widget instead of
// falling back to a bare link. Returns null when the URL doesn't carry a
// recognizable id (e.g. a plain /r/slug OpenTable link with no rid param) —
// callers should fall back to a plain link in that case.

export function isFullUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function extractOpenTableRid(url: string): string | null {
  try {
    // OpenTable restaurant pages carry the numeric booking id as ?rid=
    // even on their human-readable slug URLs — that's what the widget
    // actually keys off, not the slug itself.
    return new URL(url).searchParams.get("rid");
  } catch {
    return null;
  }
}

export function extractResySlug(url: string): string | null {
  try {
    const path = new URL(url).pathname;
    const match = path.match(/\/venues\/([^/?#]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
