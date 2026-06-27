import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inventory,
  orderItems,
  orderStatusHistory,
  orders,
  payments,
  shipments,
} from "@/lib/db/schema";
import { dispatchEvent, type WebhookEvent } from "./webhooks";

export async function listOrdersForUser(userId: string) {
  return db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.placedAt));
}

export async function getOrderForUser(orderId: string, userId: string) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
  });
  if (!order) return null;
  return enrichOrder(order);
}

export async function getOrderAdmin(orderId: string) {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) return null;
  return enrichOrder(order);
}

async function enrichOrder(order: typeof orders.$inferSelect) {
  const [items, history, pays, ships] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, order.id))
      .orderBy(orderStatusHistory.createdAt),
    db.select().from(payments).where(eq(payments.orderId, order.id)),
    db.select().from(shipments).where(eq(shipments.orderId, order.id)),
  ]);
  return { ...order, items, history, payments: pays, shipments: ships };
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["PROCESSING", "REFUNDED", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export async function updateOrderStatus(
  orderId: string,
  toStatus: string,
  actor: string,
  opts: { courier?: string; trackingNumber?: string; note?: string } = {},
) {
  const updated = await db.transaction(async (tx) => {
    const order = await tx.query.orders.findFirst({ where: eq(orders.id, orderId) });
    if (!order) throw new Error("ORDER_NOT_FOUND");
    if (!ALLOWED_TRANSITIONS[order.status]?.includes(toStatus)) {
      throw new Error(`INVALID_TRANSITION:${order.status}->${toStatus}`);
    }

    await tx
      .update(orders)
      .set({ status: toStatus as typeof order.status })
      .where(eq(orders.id, orderId));
    await tx.insert(orderStatusHistory).values({
      orderId,
      fromStatus: order.status,
      toStatus,
      note: opts.note ?? null,
      actor,
    });

    if (toStatus === "SHIPPED") {
      await tx.insert(shipments).values({
        orderId,
        courier: opts.courier ?? "JNE",
        trackingNumber: opts.trackingNumber ?? `TRK${Date.now()}`,
        status: "IN_TRANSIT",
        shippedAt: new Date(),
      });
    }
    if (toStatus === "DELIVERED") {
      await tx
        .update(shipments)
        .set({ status: "DELIVERED", deliveredAt: new Date() })
        .where(eq(shipments.orderId, orderId));
    }
    if (toStatus === "CANCELLED" && order.status !== "PENDING_PAYMENT") {
      // release any reservations still held
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      for (const it of items) {
        if (!it.variantId) continue;
        const [inv] = await tx
          .select()
          .from(inventory)
          .where(eq(inventory.variantId, it.variantId))
          .for("update");
        if (inv)
          await tx
            .update(inventory)
            .set({ quantityReserved: Math.max(0, inv.quantityReserved - it.quantity) })
            .where(eq(inventory.id, inv.id));
      }
    }

    return tx.query.orders.findFirst({ where: eq(orders.id, orderId) });
  });

  // Fire outbound webhooks after commit.
  if (updated) {
    const payload = { orderId: updated.id, orderNumber: updated.orderNumber, status: updated.status };
    const map: Record<string, WebhookEvent> = {
      SHIPPED: "order.shipped",
      DELIVERED: "order.delivered",
      CANCELLED: "order.cancelled",
      REFUNDED: "order.refunded",
    };
    const evt = map[toStatus];
    if (evt) void dispatchEvent(evt, payload);
  }
  return updated;
}

export async function cancelOrderByUser(orderId: string, userId: string) {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
  });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.status !== "PENDING_PAYMENT") throw new Error("CANNOT_CANCEL");
  return db.transaction(async (tx) => {
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    for (const it of items) {
      if (!it.variantId) continue;
      const [inv] = await tx
        .select()
        .from(inventory)
        .where(eq(inventory.variantId, it.variantId))
        .for("update");
      if (inv)
        await tx
          .update(inventory)
          .set({ quantityReserved: Math.max(0, inv.quantityReserved - it.quantity) })
          .where(eq(inventory.id, inv.id));
    }
    await tx.update(orders).set({ status: "CANCELLED" }).where(eq(orders.id, orderId));
    await tx.insert(orderStatusHistory).values({
      orderId,
      fromStatus: "PENDING_PAYMENT",
      toStatus: "CANCELLED",
      note: "Dibatalkan oleh pelanggan",
      actor: userId,
    });
    return tx.query.orders.findFirst({ where: eq(orders.id, orderId) });
  });
}
