import { and, eq } from "drizzle-orm";
import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk, apiError } from "@/lib/api/response";
import { db } from "@/lib/db";
import { orders, payments } from "@/lib/db/schema";

export const POST = withApi<{ orderId: string }>(
  async (_req, { user, params }) => {
    const order = await db.query.orders.findFirst({
      where: and(eq(orders.id, params.orderId), eq(orders.userId, user!.userId)),
    });
    if (!order) return apiError("not_found", "Order not found", 404);

    const payment = await db.query.payments.findFirst({
      where: eq(payments.orderId, order.id),
    });

    return apiOk({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      amount: order.grandTotal,
      currency: order.currency,
      paymentStatus: payment?.status ?? null,
      providerRef: payment?.providerRef ?? null,
      redirectUrl: `/checkout/pay/${order.id}`,
    });
  },
  { auth: "jwt" },
);

export { OPTIONS };
