"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";

export function ScanTrigger() {
  const router = useRouter();
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/scan/trigger", { method: "POST" })
      .catch(() => null)
      .finally(() => {
        if (cancelled) return;
        setScanning(false);
        router.replace("/notifications");
        router.refresh();
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!scanning) return null;

  return (
    <Card className="mb-6 flex items-center gap-3 py-4">
      <span className="h-2 w-2 animate-pulse rounded-full bg-clay-500" />
      <p className="text-sm text-ink-600">
        Taking a first look around — checking restaurants, dates, and a few other things…
      </p>
    </Card>
  );
}
