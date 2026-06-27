import { and, eq } from "drizzle-orm";
import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk, apiError } from "@/lib/api/response";
import { db } from "@/lib/db";
import { cmsPages } from "@/lib/db/schema";

export const GET = withApi<{ slug: string }>(
  async (_req, { params }) => {
    const page = await db.query.cmsPages.findFirst({
      where: and(eq(cmsPages.slug, params.slug), eq(cmsPages.status, "PUBLISHED")),
    });
    if (!page) return apiError("not_found", "Page not found", 404);
    return apiOk(page);
  },
  { auth: "optional", rateTier: "generous" },
);

export { OPTIONS };
