import { attachDatabasePool } from "@vercel/functions";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { authSchema } from "./auth-schema";
import * as appSchema from "./schema";

export const databaseSchema = { ...appSchema, ...authSchema };

export type AppDatabase = NodePgDatabase<typeof appSchema>;
export type RuntimeDatabase = NodePgDatabase<typeof databaseSchema>;

let pool: Pool | undefined;
let database: RuntimeDatabase | undefined;

export function getDb(): RuntimeDatabase {
  if (!database) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not configured");
    }

    pool = new Pool({ connectionString, max: 5 });
    attachDatabasePool(pool);
    database = drizzle({ client: pool, schema: databaseSchema });
  }

  return database;
}
