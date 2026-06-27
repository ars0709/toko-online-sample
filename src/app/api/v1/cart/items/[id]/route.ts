import type { NextRequest } from "next/server";
import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk, apiError } from "@/lib/api/response";
import { updateCartItemSchema } from "@/lib/validators";
import { getOrCreateCart, updateItem, removeItem, getCartView } from "@/server/services/cart";

export const PATCH = withApi<{ id: string }>(
  async (req: NextRequest, { user, params }) => {
    const parsed = updateCartItemSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError("validation_error", "Invalid input", 400, parsed.error.flatten());
    }
    const cart = await getOrCreateCart({ userId: user!.userId });
    try {
      await updateItem(cart.id, params.id, parsed.data.quantity);
    } catch (e) {
      const code = e instanceof Error ? e.message : "CART_ERROR";
      if (code === "ITEM_NOT_FOUND") return apiError("not_found", "Item not found", 404);
      if (code === "INSUFFICIENT_STOCK") return apiError("insufficient_stock", "Not enough stock", 422);
      throw e;
    }
    const view = await getCartView(cart.id, user!.userId);
    return apiOk(view);
  },
  { auth: "jwt" },
);

export const DELETE = withApi<{ id: string }>(
  async (_req, { user, params }) => {
    const cart = await getOrCreateCart({ userId: user!.userId });
    await removeItem(cart.id, params.id);
    const view = await getCartView(cart.id, user!.userId);
    return apiOk(view);
  },
  { auth: "jwt" },
);

export { OPTIONS };
