import type { NextRequest } from "next/server";
import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk, apiError } from "@/lib/api/response";
import { validateCoupon } from "@/server/services/pricing";

export const GET = withApi(
  async (req: NextRequest, { user }) => {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    if (!code) return apiError("validation_error", "code query param is required", 400);
    const subtotal = Number(url.searchParams.get("subtotal") ?? "0") || 0;
    const result = await validateCoupon(code, subtotal, user?.userId);
    return apiOk(result);
  },
  { auth: "optional", rateTier: "generous" },
);

export { OPTIONS };
