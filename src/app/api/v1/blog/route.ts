import type { NextRequest } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk } from "@/lib/api/response";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";

const LIMIT = 12;

export const GET = withApi(
  async (req: NextRequest) => {
    const url = new URL(req.url);
    const tag = url.searchParams.get("tag");
    const cursor = url.searchParams.get("cursor");

    const where = [eq(blogPosts.status, "PUBLISHED")];
    if (tag) where.push(sql`${blogPosts.tags} @> ${JSON.stringify([tag])}::jsonb`);
    if (cursor) where.push(sql`${blogPosts.id} < ${cursor}`);

    const rows = await db
      .select({
        id: blogPosts.id,
        slug: blogPosts.slug,
        title: blogPosts.title,
        excerpt: blogPosts.excerpt,
        coverImage: blogPosts.coverImage,
        tags: blogPosts.tags,
        publishedAt: blogPosts.publishedAt,
      })
      .from(blogPosts)
      .where(and(...where))
      .orderBy(desc(blogPosts.id))
      .limit(LIMIT + 1);

    const hasMore = rows.length > LIMIT;
    const page = rows.slice(0, LIMIT);
    return apiOk(page, {
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
      hasMore,
    });
  },
  { auth: "optional", rateTier: "generous" },
);

export { OPTIONS };
