import { NextRequest, NextResponse } from "next/server";
import { runFullScan } from "@/lib/scan-engine";

export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await runFullScan();
  return NextResponse.json(result);
}
