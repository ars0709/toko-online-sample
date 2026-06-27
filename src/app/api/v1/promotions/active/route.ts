import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk } from "@/lib/api/response";
import { db } from "@/lib/db";
import { flashSales, promotions } from "@/lib/db/schema";

export const GET = withApi(
  async () => {
    const now = new Date();
    const [promos, sales] = await Promise.all([
      db
        .select()
        .from(promotions)
        .where(
          and(
            eq(promotions.isActive, true),
            or(isNull(promotions.startsAt), lte(promotions.startsAt, now)),
            or(isNull(promotions.endsAt), gte(promotions.endsAt, now)),
          ),
        ),
      db
        .select()
        .from(flashSales)
        .where(and(lte(flashSales.startsAt, now), gte(flashSales.endsAt, now))),
    ]);
    return apiOk({ promotions: promos, flashSales: sales });
  },
  { auth: "optional", rateTier: "generous" },
);

export { OPTIONS };
