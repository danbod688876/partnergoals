import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Vercel's native Neon integration (Storage tab -> connect a database)
// provisions its connection string under a project-prefixed name like
// `partnergoals_DATABASE_URL` rather than plain `DATABASE_URL`, and marks it
// read-only in the dashboard since it's synced from the connected resource.
// Prefer that prefixed var when present; fall back to plain DATABASE_URL for
// local dev / manually-set env vars, then a placeholder so the module can
// still load during `next build` (which collects page data without
// executing queries) even with neither set. Any real query without a real
// connection string will fail loudly at request time instead.
const connectionString =
  process.env.partnergoals_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://user:password@placeholder.tld/db";

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
