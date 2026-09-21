import { NextRequest, NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const authed = await isAuthed(req.cookies.get("pg_auth")?.value);

  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!login|api/login|_next/static|_next/image|favicon.ico).*)",
  ],
};
