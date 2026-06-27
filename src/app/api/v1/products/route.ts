import type { NextRequest } from "next/server";
import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk, apiError } from "@/lib/api/response";
import { productQuerySchema } from "@/lib/validators";
import { listProducts } from "@/server/services/catalog";

export const GET = withApi(
  async (req: NextRequest) => {
    const params = Object.fromEntries(new URL(req.url).searchParams);
    const parsed = productQuerySchema.safeParse(params);
    if (!parsed.success) {
      return apiError("validation_error", "Invalid query", 400, parsed.error.flatten());
    }
    const result = await listProducts(parsed.data);
    return apiOk(result.items, { nextCursor: result.nextCursor, hasMore: result.hasMore });
  },
  { auth: "optional", rateTier: "generous" },
);

export { OPTIONS };
