"use server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { signWebhook, verifyWebhook } from "@/lib/payments";
import { processPaymentResult } from "@/server/services/payment";

/**
 * Simulate a payment outcome from the mock pay page. To stay faithful to a real
 * gateway, we build a signed webhook payload and verify it before processing —
 * exactly what the public webhook endpoint does for an external provider.
 */
export async function payMockAction(orderId: string, result: "PAID" | "FAILED") {
  const user = await requireUser();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order || order.userId !== user.id) throw new Error("ORDER_NOT_FOUND");

  const body = JSON.stringify({ orderId, result, provider: "mock" });
  const ts = String(Date.now());
  const sig = signWebhook(body, ts);
  if (!verifyWebhook(body, ts, sig)) throw new Error("BAD_SIGNATURE");

  await processPaymentResult(orderId, result, "card");
  redirect(`/orders/${orderId}`);
}
