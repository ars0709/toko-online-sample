import { and, desc, eq } from "drizzle-orm";
import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk, apiError } from "@/lib/api/response";
import { db } from "@/lib/db";
import { products, reviews } from "@/lib/db/schema";

export const GET = withApi<{ slug: string }>(
  async (_req, { params }) => {
    const product = await db.query.products.findFirst({
      where: eq(products.slug, params.slug),
      columns: { id: true },
    });
    if (!product) return apiError("not_found", "Product not found", 404);

    const rows = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        title: reviews.title,
        body: reviews.body,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .where(and(eq(reviews.productId, product.id), eq(reviews.status, "PUBLISHED")))
      .orderBy(desc(reviews.createdAt));

    return apiOk(rows);
  },
  { auth: "optional", rateTier: "generous" },
);

export { OPTIONS };
