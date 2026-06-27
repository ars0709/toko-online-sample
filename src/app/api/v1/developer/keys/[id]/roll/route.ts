import { and, eq } from "drizzle-orm";
import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk, apiError } from "@/lib/api/response";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { generateApiKey } from "@/lib/auth/api-key";

export const POST = withApi<{ id: string }>(
  async (_req, { user, params }) => {
    const old = await db.query.apiKeys.findFirst({
      where: and(eq(apiKeys.id, params.id), eq(apiKeys.ownerUserId, user!.userId)),
    });
    if (!old) return apiError("not_found", "API key not found", 404);

    const { plaintext, hashedKey, keyPrefix } = generateApiKey(old.environment);

    const [created] = await db.transaction(async (tx) => {
      if (!old.revokedAt) {
        await tx.update(apiKeys).set({ revokedAt: new Date() }).where(eq(apiKeys.id, old.id));
      }
      return tx
        .insert(apiKeys)
        .values({
          ownerUserId: user!.userId,
          label: `${old.label} (rolled)`,
          environment: old.environment,
          keyPrefix,
          hashedKey,
          scopes: old.scopes,
          rateLimitTier: old.rateLimitTier,
          allowedOrigins: old.allowedOrigins,
          ipAllowlist: old.ipAllowlist,
          expiresAt: old.expiresAt,
        })
        .returning();
    });

    return apiOk({
      id: created.id,
      label: created.label,
      environment: created.environment,
      keyPrefix: created.keyPrefix,
      scopes: created.scopes,
      key: plaintext,
    });
  },
  { auth: "jwt" },
);

export { OPTIONS };
