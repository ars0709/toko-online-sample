import type { NextRequest } from "next/server";
import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk, apiError } from "@/lib/api/response";
import { addToCartSchema } from "@/lib/validators";
import { getOrCreateCart, addItem, getCartView } from "@/server/services/cart";

export const POST = withApi(
  async (req: NextRequest, { user }) => {
    const parsed = addToCartSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError("validation_error", "Invalid input", 400, parsed.error.flatten());
    }
    const cart = await getOrCreateCart({ userId: user!.userId });
    try {
      await addItem(cart.id, parsed.data.variantId, parsed.data.quantity);
    } catch (e) {
      const code = e instanceof Error ? e.message : "CART_ERROR";
      if (code === "VARIANT_NOT_FOUND") return apiError("not_found", "Variant not found", 404);
      if (code === "INSUFFICIENT_STOCK") return apiError("insufficient_stock", "Not enough stock", 422);
      throw e;
    }
    const view = await getCartView(cart.id, user!.userId);
    return apiOk(view, undefined, { status: 201 });
  },
  { auth: "jwt" },
);

export { OPTIONS };
