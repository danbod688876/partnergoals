"use client";

export function DeleteButton({
  label = "Delete",
  confirmText = "Delete this? This can't be undone.",
}: {
  label?: string;
  confirmText?: string;
}) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
      className="text-sm text-ink-400 transition-colors hover:text-clay-600"
    >
      {label}
    </button>
  );
}
