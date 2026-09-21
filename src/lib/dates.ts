export function nextOccurrence(dateStr: string, recurrence: string, today = new Date()): Date {
  const d = new Date(dateStr + "T00:00:00");
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (recurrence === "one_time") {
    return d;
  }

  let next = new Date(todayMid.getFullYear(), d.getMonth(), d.getDate());
  if (next < todayMid) {
    next = new Date(todayMid.getFullYear() + 1, d.getMonth(), d.getDate());
  }
  return next;
}

export function daysUntil(date: Date, today = new Date()): number {
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = date.getTime() - todayMid.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}
