import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { cookies } from "next/headers";
import { NavBar } from "@/components/NavBar";
import { isAuthed } from "@/lib/auth";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "PartnerGoals",
  description: "A private place to keep track of what matters to your partner.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const authed = await isAuthed(cookieStore.get("pg_auth")?.value);

  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable} font-sans antialiased`}>
        {authed && <NavBar />}
        <main className="mx-auto max-w-3xl px-5 py-8">{children}</main>
      </body>
    </html>
  );
}
