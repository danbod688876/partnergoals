export function BookingButton({ href, label }: { href: string; label: string }) {
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
