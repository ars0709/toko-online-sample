import { z } from "zod";

/**
 * Load .env for non-Next runtimes (tsx scripts, drizzle-kit). In the Next.js
 * runtime the variables are already present, so loadEnvFile is a no-op fallback.
 */
function ensureEnvLoaded() {
  if (!process.env.DATABASE_URL && typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile();
    } catch {
      /* .env not found — rely on the real process env */
    }
  }
}
ensureEnvLoaded();

const schema = z.object({
  APP_URL: z.string().url().default("http://localhost:3000"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(16),
  JWT_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.coerce.number().default(900),
  JWT_REFRESH_TTL: z.coerce.number().default(1209600),
  PAYMENT_WEBHOOK_SECRET: z.string().min(8),
  API_CORS_ORIGINS: z.string().default("*"),
  TAX_RATE: z.coerce.number().default(0.11),
  SHIPPING_FLAT: z.coerce.number().default(20000),
  FREE_SHIPPING_THRESHOLD: z.coerce.number().default(300000),
});

export const env = schema.parse(process.env);
export type Env = z.infer<typeof schema>;
