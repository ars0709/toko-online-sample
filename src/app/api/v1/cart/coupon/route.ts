import type { NextRequest } from "next/server";
import { z } from "zod";
import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk, apiError } from "@/lib/api/response";
import { getOrCreateCart, setCoupon, getCartView } from "@/server/services/cart";

const schema = z.object({ code: z.string().max(64).nullable() });

export const POST = withApi(
  async (req: NextRequest, { user }) => {
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return apiError("validation_error", "Invalid input", 400);
    const cart = await getOrCreateCart({ userId: user!.userId });
    await setCoupon(cart.id, parsed.data.code);
    const view = await getCartView(cart.id, user!.userId);
    return apiOk(view);
  },
  { auth: "jwt" },
);

export { OPTIONS };
