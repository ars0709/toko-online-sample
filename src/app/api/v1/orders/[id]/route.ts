import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk, apiError } from "@/lib/api/response";
import { getOrderForUser } from "@/server/services/orders";

export const GET = withApi<{ id: string }>(
  async (_req, { user, params }) => {
    const order = await getOrderForUser(params.id, user!.userId);
    if (!order) return apiError("not_found", "Order not found", 404);
    return apiOk(order);
  },
  { auth: "jwt" },
);

export { OPTIONS };
