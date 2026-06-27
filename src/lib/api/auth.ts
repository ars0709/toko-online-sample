import type { NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys, apiKeyUsage } from "@/lib/db/schema";
import { hashApiKey } from "@/lib/auth/api-key";
import { verifyToken } from "@/lib/auth/jwt";

export type ApiKeyRow = typeof apiKeys.$inferSelect;

export type JwtContext = {
  userId: string;
  email: string;
  role: "CUSTOMER" | "ADMIN";
};

/** Pull a raw API key from `Authorization: Bearer sk_...` or `X-API-Key`. */
function extractApiKey(req: NextRequest): string | null {
  const header = req.headers.get("x-api-key");
  if (header && header.trim()) return header.trim();
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    if (token.startsWith("sk_")) return token;
  }
  return null;
}

/** Fire-and-forget usage accounting (never blocks the request path). */
function recordUsage(apiKeyId: string) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  void db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKeyId))
    .catch(() => {});
  void db
    .insert(apiKeyUsage)
    .values({ apiKeyId, date: today, requestCount: 1 })
    .onConflictDoUpdate({
      target: [apiKeyUsage.apiKeyId, apiKeyUsage.date],
      set: { requestCount: sql`${apiKeyUsage.requestCount} + 1` },
    })
    .catch(() => {});
}

/**
 * Validate an API key if one is present. Returns the row, or null when no key
 * header was sent. Throws nothing — invalid keys resolve to `null`.
 */
export async function authenticateApiKey(req: NextRequest): Promise<ApiKeyRow | null> {
  const raw = extractApiKey(req);
  if (!raw) return null;

  const hashed = hashApiKey(raw);
  const row = await db.query.apiKeys.findFirst({ where: eq(apiKeys.hashedKey, hashed) });
  if (!row) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;

  recordUsage(row.id);
  return row;
}

/** Validate a JWT access token if present. Returns null on any failure. */
export async function authenticateJwt(req: NextRequest): Promise<JwtContext | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token || token.startsWith("sk_")) return null;
  try {
    const payload = await verifyToken(token);
    if (payload.type !== "access") return null;
    return { userId: payload.sub, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

/** Does the API key carry the given scope? */
export function hasScope(apiKey: ApiKeyRow | null | undefined, scope: string): boolean {
  if (!apiKey) return false;
  return Array.isArray(apiKey.scopes) && apiKey.scopes.includes(scope);
}
