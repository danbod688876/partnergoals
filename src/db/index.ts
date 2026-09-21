import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Falls back to a placeholder so the module can be loaded during `next build`
// (which collects page data without executing queries) even when
// DATABASE_URL isn't available in the build environment. Any real query
// without a real DATABASE_URL will fail loudly at request time instead.
const connectionString =
  process.env.DATABASE_URL ?? "postgresql://user:password@placeholder.tld/db";

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
