import type { NextRequest } from "next/server";
import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk, apiError } from "@/lib/api/response";
import { redis } from "@/lib/redis";
import { placeOrderSchema } from "@/lib/validators";
import { placeOrder, CheckoutError } from "@/server/services/checkout";
import { listOrdersForUser, getOrderForUser } from "@/server/services/orders";

const IDEM_TTL = 60 * 60 * 24; // 24h

export const POST = withApi(
  async (req: NextRequest, { user }) => {
    const parsed = placeOrderSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError("validation_error", "Invalid input", 400, parsed.error.flatten());
    }

    const idemKey = req.headers.get("idempotency-key");
    if (idemKey) {
      const existingId = await redis.get(`idem:${user!.userId}:${idemKey}`);
      if (existingId) {
        const existing = await getOrderForUser(existingId, user!.userId);
        if (existing) return apiOk({ order: existing, idempotent: true });
      }
    }

    try {
      const result = await placeOrder({
        userId: user!.userId,
        addressId: parsed.data.addressId,
        address: parsed.data.address,
        couponCode: parsed.data.couponCode,
      });
      if (idemKey) {
        await redis.set(`idem:${user!.userId}:${idemKey}`, result.order.id, "EX", IDEM_TTL);
      }
      return apiOk(
        { order: result.order, redirectUrl: result.redirectUrl },
        undefined,
        { status: 201 },
      );
    } catch (e) {
      if (e instanceof CheckoutError) return apiError(e.code.toLowerCase(), e.message, 422);
      throw e;
    }
  },
  { auth: "jwt", rateTier: "checkout" },
);

export const GET = withApi(
  async (_req, { user }) => {
    const orders = await listOrdersForUser(user!.userId);
    return apiOk(orders);
  },
  { auth: "jwt" },
);

export { OPTIONS };
