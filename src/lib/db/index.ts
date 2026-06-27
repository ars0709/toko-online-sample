import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __toko_pg: ReturnType<typeof postgres> | undefined;
}

// Reuse the connection across hot-reloads in dev.
const client =
  global.__toko_pg ?? postgres(env.DATABASE_URL, { max: 10, prepare: false });

if (process.env.NODE_ENV !== "production") global.__toko_pg = client;

export const db = drizzle(client, { schema, casing: "snake_case" });
export { schema };
export type DB = typeof db;
