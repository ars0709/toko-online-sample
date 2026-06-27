import { and, eq } from "drizzle-orm";
import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk, apiError } from "@/lib/api/response";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";

export const DELETE = withApi<{ id: string }>(
  async (_req, { user, params }) => {
    const key = await db.query.apiKeys.findFirst({
      where: and(eq(apiKeys.id, params.id), eq(apiKeys.ownerUserId, user!.userId)),
    });
    if (!key) return apiError("not_found", "API key not found", 404);
    if (!key.revokedAt) {
      await db.update(apiKeys).set({ revokedAt: new Date() }).where(eq(apiKeys.id, key.id));
    }
    return apiOk({ success: true });
  },
  { auth: "jwt" },
);

export { OPTIONS };
