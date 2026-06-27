import type { NextRequest } from "next/server";
import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk, apiError } from "@/lib/api/response";
import { getProductBySlug } from "@/server/services/catalog";

export const GET = withApi<{ slug: string }>(
  async (_req, { params }) => {
    const product = await getProductBySlug(params.slug);
    if (!product) return apiError("not_found", "Product not found", 404);
    return apiOk(product);
  },
  { auth: "optional", rateTier: "generous" },
);

export { OPTIONS };
