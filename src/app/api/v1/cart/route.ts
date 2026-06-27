import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk } from "@/lib/api/response";
import { getOrCreateCart, getCartView } from "@/server/services/cart";

export const GET = withApi(
  async (_req, { user }) => {
    const cart = await getOrCreateCart({ userId: user!.userId });
    const view = await getCartView(cart.id, user!.userId);
    return apiOk(view);
  },
  { auth: "jwt" },
);

export { OPTIONS };
