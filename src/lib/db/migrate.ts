import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { env } from "../env";

async function main() {
  const client = postgres(env.DATABASE_URL, { max: 1 });
  const db = drizzle(client);
  console.log("⏳ Running migrations...");
  await migrate(db, { migrationsFolder: "./src/lib/db/migrations" });

  // Full-text search index for products (idempotent).
  await client`
    CREATE INDEX IF NOT EXISTS products_fts_idx ON products
    USING gin (to_tsvector('simple',
      coalesce(name,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(description,'')))
  `;

  console.log("✅ Migrations complete");
  await client.end();
}

main().catch((err) => {
  console.error("❌ Migration failed", err);
  process.exit(1);
});
