import { desc, eq, sql } from "drizzle-orm";
import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk } from "@/lib/api/response";
import { db } from "@/lib/db";
import { apiKeys, apiKeyUsage } from "@/lib/db/schema";

export const GET = withApi(
  async (_req, { user }) => {
    const today = new Date().toISOString().slice(0, 10);

    const rows = await db
      .select({
        apiKeyId: apiKeyUsage.apiKeyId,
        label: apiKeys.label,
        keyPrefix: apiKeys.keyPrefix,
        date: apiKeyUsage.date,
        requestCount: apiKeyUsage.requestCount,
        errorCount: apiKeyUsage.errorCount,
      })
      .from(apiKeyUsage)
      .innerJoin(apiKeys, eq(apiKeys.id, apiKeyUsage.apiKeyId))
      .where(eq(apiKeys.ownerUserId, user!.userId))
      .orderBy(desc(apiKeyUsage.date));

    let totalRequests = 0;
    let totalErrors = 0;
    let todayRequests = 0;
    for (const r of rows) {
      totalRequests += r.requestCount;
      totalErrors += r.errorCount;
      if (r.date === today) todayRequests += r.requestCount;
    }

    const [{ count: activeKeys } = { count: 0 }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(apiKeys)
      .where(eq(apiKeys.ownerUserId, user!.userId));

    return apiOk({
      totalRequests,
      totalErrors,
      todayRequests,
      activeKeys,
      daily: rows,
    });
  },
  { auth: "jwt" },
);

export { OPTIONS };
