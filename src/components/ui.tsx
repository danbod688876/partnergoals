export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="font-serif text-2xl text-ink-800">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-ink-400">{subtitle}</p>}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl2 border border-ink-100 bg-white p-5 shadow-soft ${className}`}
    >
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl2 border border-dashed border-ink-100 bg-cream-100/40 px-5 py-8 text-center text-sm text-ink-400">
      {children}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400";

export const labelClass = "mb-1.5 block text-sm font-medium text-ink-700";

export const primaryButtonClass =
  "rounded-lg bg-clay-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-clay-600 disabled:opacity-60";

export const secondaryButtonClass =
  "rounded-lg border border-ink-100 bg-white px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50";

export const ghostLinkClass =
  "text-sm text-clay-600 hover:text-clay-700 hover:underline underline-offset-2";
