import type { NextRequest } from "next/server";
import { and, asc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk } from "@/lib/api/response";
import { db } from "@/lib/db";
import { banners } from "@/lib/db/schema";

const PLACEMENTS = ["HOME_HERO", "HOME_STRIP", "CATEGORY_TOP", "CHECKOUT"] as const;
type Placement = (typeof PLACEMENTS)[number];

export const GET = withApi(
  async (req: NextRequest) => {
    const now = new Date();
    const placement = new URL(req.url).searchParams.get("placement");

    const where = [
      eq(banners.isActive, true),
      or(isNull(banners.startsAt), lte(banners.startsAt, now)),
      or(isNull(banners.endsAt), gte(banners.endsAt, now)),
    ];
    if (placement && (PLACEMENTS as readonly string[]).includes(placement)) {
      where.push(eq(banners.placement, placement as Placement));
    }

    const rows = await db
      .select()
      .from(banners)
      .where(and(...where))
      .orderBy(asc(banners.sortOrder));
    return apiOk(rows);
  },
  { auth: "optional", rateTier: "generous" },
);

export { OPTIONS };
