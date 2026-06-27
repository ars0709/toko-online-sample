import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inventory,
  orderItems,
  orderStatusHistory,
  orders,
  payments,
} from "@/lib/db/schema";
import { dispatchEvent } from "./webhooks";

/**
 * Process a payment result. Called by the (signature-verified) webhook handler.
 * - PAID: order -> PAID, convert reserved stock into a real decrement (sold).
 * - FAILED: order -> CANCELLED, release the reserved stock.
 */
export async function processPaymentResult(orderId: string, result: "PAID" | "FAILED", method = "mock") {
  const outcome = await db.transaction(async (tx) => {
    const order = await tx.query.orders.findFirst({ where: eq(orders.id, orderId) });
    if (!order) throw new Error("ORDER_NOT_FOUND");
    if (order.status !== "PENDING_PAYMENT") {
      return { order, alreadyProcessed: true };
    }

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));

    if (result === "PAID") {
      for (const it of items) {
        if (!it.variantId) continue;
        const [inv] = await tx
          .select()
          .from(inventory)
          .where(eq(inventory.variantId, it.variantId))
          .for("update");
        if (inv) {
          await tx
            .update(inventory)
            .set({
              quantityReserved: Math.max(0, inv.quantityReserved - it.quantity),
              quantityOnHand: Math.max(0, inv.quantityOnHand - it.quantity),
            })
            .where(eq(inventory.id, inv.id));
        }
      }
      await tx
        .update(orders)
        .set({ status: "PAID" })
        .where(eq(orders.id, orderId));
      await tx
        .update(payments)
        .set({ status: "PAID", method, paidAt: new Date() })
        .where(eq(payments.orderId, orderId));
      await tx.insert(orderStatusHistory).values({
        orderId,
        fromStatus: "PENDING_PAYMENT",
        toStatus: "PAID",
        note: "Pembayaran berhasil",
        actor: "payment-gateway",
      });
    } else {
      // release reservations
      for (const it of items) {
        if (!it.variantId) continue;
        const [inv] = await tx
          .select()
          .from(inventory)
          .where(eq(inventory.variantId, it.variantId))
          .for("update");
        if (inv) {
          await tx
            .update(inventory)
            .set({ quantityReserved: Math.max(0, inv.quantityReserved - it.quantity) })
            .where(eq(inventory.id, inv.id));
        }
      }
      await tx.update(orders).set({ status: "CANCELLED" }).where(eq(orders.id, orderId));
      await tx
        .update(payments)
        .set({ status: "FAILED" })
        .where(eq(payments.orderId, orderId));
      await tx.insert(orderStatusHistory).values({
        orderId,
        fromStatus: "PENDING_PAYMENT",
        toStatus: "CANCELLED",
        note: "Pembayaran gagal / dibatalkan",
        actor: "payment-gateway",
      });
    }

    const updated = await tx.query.orders.findFirst({ where: eq(orders.id, orderId) });
    return { order: updated!, alreadyProcessed: false };
  });

  // Dispatch outbound webhooks after the transaction commits (fire-and-forget).
  if (!outcome.alreadyProcessed) {
    const o = outcome.order;
    const payload = { orderId: o.id, orderNumber: o.orderNumber, grandTotal: o.grandTotal, status: o.status };
    if (result === "PAID") void dispatchEvent("order.paid", payload);
    else void dispatchEvent("payment.failed", payload);
  }
  return outcome;
}

export async function createPaymentIntentRecord(orderId: string) {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  const existing = await db.query.payments.findFirst({
    where: and(eq(payments.orderId, orderId), eq(payments.status, "INITIATED")),
  });
  return { order, payment: existing };
}
