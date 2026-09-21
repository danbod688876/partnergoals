const COOKIE_NAME = "pg_auth";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function expectedToken(): Promise<string> {
  const password = process.env.APP_PASSWORD ?? "";
  return sha256Hex(`partnergoals:${password}`);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function tokenForPassword(candidate: string): Promise<string | null> {
  if (!process.env.APP_PASSWORD) return null;
  if (candidate !== process.env.APP_PASSWORD) return null;
  return expectedToken();
}

export async function isAuthed(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue || !process.env.APP_PASSWORD) return false;
  const expected = await expectedToken();
  return constantTimeEqual(cookieValue, expected);
}

export const AUTH_COOKIE = {
  name: COOKIE_NAME,
  maxAge: MAX_AGE,
};
