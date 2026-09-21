import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE.name);
  return NextResponse.redirect(new URL("/login", req.url));
}
