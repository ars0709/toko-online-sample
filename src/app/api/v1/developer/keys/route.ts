import type { NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk, apiError } from "@/lib/api/response";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { generateApiKey } from "@/lib/auth/api-key";
import { createApiKeySchema } from "@/lib/validators";

function publicKey(row: typeof apiKeys.$inferSelect) {
  return {
    id: row.id,
    label: row.label,
    environment: row.environment,
    keyPrefix: row.keyPrefix,
    scopes: row.scopes,
    lastUsedAt: row.lastUsedAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
    status: row.revokedAt ? "REVOKED" : "ACTIVE",
  };
}

export const GET = withApi(
  async (_req, { user }) => {
    const rows = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.ownerUserId, user!.userId))
      .orderBy(desc(apiKeys.createdAt));
    return apiOk(rows.map(publicKey));
  },
  { auth: "jwt" },
);

export const POST = withApi(
  async (req: NextRequest, { user }) => {
    const parsed = createApiKeySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError("validation_error", "Invalid input", 400, parsed.error.flatten());
    }
    const { plaintext, hashedKey, keyPrefix } = generateApiKey(parsed.data.environment);
    const [row] = await db
      .insert(apiKeys)
      .values({
        ownerUserId: user!.userId,
        label: parsed.data.label,
        environment: parsed.data.environment,
        keyPrefix,
        hashedKey,
        scopes: parsed.data.scopes,
        allowedOrigins: parsed.data.allowedOrigins,
        ipAllowlist: parsed.data.ipAllowlist,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      })
      .returning();
    return apiOk({ ...publicKey(row), key: plaintext }, undefined, { status: 201 });
  },
  { auth: "jwt" },
);

export { OPTIONS };
