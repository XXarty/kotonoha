import { attachDatabasePool } from "@vercel/functions";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

export type AppDatabase = NodePgDatabase<typeof schema>;

let pool: Pool | undefined;
let database: AppDatabase | undefined;

export function getDb(): AppDatabase {
  if (!database) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not configured");
    }

    pool = new Pool({ connectionString, max: 5 });
    attachDatabasePool(pool);
    database = drizzle({ client: pool, schema });
  }

  return database;
}
