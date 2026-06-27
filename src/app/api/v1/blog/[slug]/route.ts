import { and, eq } from "drizzle-orm";
import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk, apiError } from "@/lib/api/response";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";

export const GET = withApi<{ slug: string }>(
  async (_req, { params }) => {
    const post = await db.query.blogPosts.findFirst({
      where: and(eq(blogPosts.slug, params.slug), eq(blogPosts.status, "PUBLISHED")),
    });
    if (!post) return apiError("not_found", "Post not found", 404);
    return apiOk(post);
  },
  { auth: "optional", rateTier: "generous" },
);

export { OPTIONS };
