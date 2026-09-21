"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, tokenForPassword } from "@/lib/auth";

export async function login(_prevState: { error: string } | undefined, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const token = await tokenForPassword(password);

  if (!token) {
    return { error: "That password isn't right — try again." };
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE.name, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: AUTH_COOKIE.maxAge,
    path: "/",
  });

  redirect("/profile");
}
