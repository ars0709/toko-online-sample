import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk, apiError } from "@/lib/api/response";
import { cancelOrderByUser } from "@/server/services/orders";

export const POST = withApi<{ id: string }>(
  async (_req, { user, params }) => {
    try {
      const order = await cancelOrderByUser(params.id, user!.userId);
      return apiOk(order);
    } catch (e) {
      const code = e instanceof Error ? e.message : "ERROR";
      if (code === "ORDER_NOT_FOUND") return apiError("not_found", "Order not found", 404);
      if (code === "CANNOT_CANCEL") return apiError("cannot_cancel", "Order cannot be cancelled", 422);
      throw e;
    }
  },
  { auth: "jwt" },
);

export { OPTIONS };
