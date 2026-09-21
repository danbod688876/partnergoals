"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/", label: "Notifications", exact: true },
  { href: "/upcoming", label: "Upcoming" },
  { href: "/profile", label: "Profile" },
  { href: "/preferences", label: "Preferences" },
  { href: "/dates", label: "Key Dates" },
  { href: "/gifts", label: "Gift Log" },
  { href: "/activities", label: "Activities" },
  { href: "/restaurants", label: "Restaurants" },
  { href: "/stores", label: "Stores" },
];

function isActive(pathname: string | null, link: (typeof LINKS)[number]): boolean {
  if (!pathname) return false;
  if (link.exact) return pathname === link.href || pathname === "/notifications";
  return pathname.startsWith(link.href);
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-clay-500 px-1 text-[10px] font-semibold leading-none text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function NavBar({ openNotificationCount = 0 }: { openNotificationCount?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname?.startsWith("/onboarding")) return null;

  return (
    <header className="border-b border-ink-100 bg-cream-50/90 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
        <Link href="/" className="font-serif text-lg text-clay-700 tracking-tight">
          PartnerGoals
        </Link>

        <nav className="hidden flex-wrap justify-end gap-1 lg:flex">
          {LINKS.map((link) => {
            const active = isActive(pathname, link);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center whitespace-nowrap rounded-full px-2.5 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-clay-100 text-clay-800"
                    : "text-ink-600 hover:bg-ink-50 hover:text-ink-800"
                }`}
              >
                {link.label}
                {link.href === "/" && <Badge count={openNotificationCount} />}
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
          className="relative rounded-full p-2 text-ink-600 hover:bg-ink-50 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {openNotificationCount > 0 && (
            <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-clay-500" />
          )}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-ink-100 px-5 py-3 lg:hidden">
          {LINKS.map((link) => {
            const active = isActive(pathname, link);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`flex items-center rounded-lg px-3 py-2 text-sm ${
                  active ? "bg-clay-100 text-clay-800" : "text-ink-600"
                }`}
              >
                {link.label}
                {link.href === "/" && <Badge count={openNotificationCount} />}
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
