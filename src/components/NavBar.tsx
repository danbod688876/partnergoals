"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/profile", label: "Profile" },
  { href: "/preferences", label: "Preferences" },
  { href: "/dates", label: "Key Dates" },
  { href: "/gifts", label: "Gift Log" },
  { href: "/activities", label: "Activities" },
  { href: "/stores", label: "Stores" },
];

export function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-ink-100 bg-cream-50/90 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
        <Link href="/profile" className="font-serif text-lg text-clay-700 tracking-tight">
          PartnerGoals
        </Link>

        <nav className="hidden gap-1 sm:flex">
          {LINKS.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-clay-100 text-clay-800"
                    : "text-ink-600 hover:bg-ink-50 hover:text-ink-800"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <form action="/api/logout" method="post">
            <button
              type="submit"
              className="rounded-full px-3 py-1.5 text-sm text-ink-400 hover:bg-ink-50 hover:text-ink-700"
            >
              Log out
            </button>
          </form>
        </nav>

        <button
          className="rounded-full p-2 text-ink-600 hover:bg-ink-50 sm:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-ink-100 px-5 py-3 sm:hidden">
          {LINKS.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2 text-sm ${
                  active ? "bg-clay-100 text-clay-800" : "text-ink-600"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <form action="/api/logout" method="post">
            <button type="submit" className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink-400">
              Log out
            </button>
          </form>
        </nav>
      )}
    </header>
  );
}
