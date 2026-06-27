import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  addresses,
  cartItems,
  carts,
  coupons,
  couponRedemptions,
  inventory,
  orderItems,
  orderStatusHistory,
  orders,
  payments,
  productVariants,
  products,
} from "@/lib/db/schema";
import { generateOrderNumber, slugify } from "@/lib/utils";
import { uuidv7 } from "uuidv7";
import { computeTotals, validateCoupon } from "./pricing";
import { paymentProvider } from "@/lib/payments";

export class CheckoutError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

type PlaceOrderInput = {
  userId: string;
  addressId?: string;
  address?: {
    label?: string;
    recipient: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    province: string;
    postalCode: string;
    country?: string;
  };
  couponCode?: string | null;
};

export async function placeOrder(input: PlaceOrderInput) {
  // Resolve shipping address snapshot
  let shippingAddress: Record<string, unknown>;
  if (input.addressId) {
    const addr = await db.query.addresses.findFirst({
      where: and(eq(addresses.id, input.addressId), eq(addresses.userId, input.userId)),
    });
    if (!addr) throw new CheckoutError("ADDRESS_NOT_FOUND", "Alamat tidak ditemukan");
    shippingAddress = addr;
  } else if (input.address) {
    shippingAddress = input.address;
  } else {
    throw new CheckoutError("ADDRESS_REQUIRED", "Alamat pengiriman wajib diisi");
  }

  // Load the user's active cart + items
  const cart = await db.query.carts.findFirst({
    where: and(eq(carts.userId, input.userId), eq(carts.status, "ACTIVE")),
  });
  if (!cart) throw new CheckoutError("CART_EMPTY", "Keranjang kosong");
  const items = await db.select().from(cartItems).where(eq(cartItems.cartId, cart.id));
  if (items.length === 0) throw new CheckoutError("CART_EMPTY", "Keranjang kosong");

  const couponCode = input.couponCode ?? cart.couponCode;

  return db.transaction(async (tx) => {
    // Lock inventory rows & reserve stock (prevents oversell)
    const snapshots: Array<{
      variantId: string;
      productName: string;
      variantName: string;
      sku: string;
      unitPrice: number;
      quantity: number;
    }> = [];

    for (const it of items) {
      const [inv] = await tx
        .select()
        .from(inventory)
        .where(eq(inventory.variantId, it.variantId))
        .for("update");
      if (!inv) throw new CheckoutError("VARIANT_NOT_FOUND", "Produk tidak tersedia");
      const available = inv.quantityOnHand - inv.quantityReserved;
      if (available < it.quantity)
        throw new CheckoutError("INSUFFICIENT_STOCK", "Stok tidak mencukupi");

      await tx
        .update(inventory)
        .set({ quantityReserved: inv.quantityReserved + it.quantity })
        .where(eq(inventory.id, inv.id));

      const v = await tx
        .select({
          name: productVariants.name,
          sku: productVariants.sku,
          price: productVariants.price,
          productName: products.name,
        })
        .from(productVariants)
        .innerJoin(products, eq(products.id, productVariants.productId))
        .where(eq(productVariants.id, it.variantId));
      const meta = v[0];
      snapshots.push({
        variantId: it.variantId,
        productName: meta.productName,
        variantName: meta.name,
        sku: meta.sku,
        unitPrice: it.unitPriceSnapshot,
        quantity: it.quantity,
      });
    }

    const totals = await computeTotals(
      snapshots.map((s) => ({ variantId: s.variantId, quantity: s.quantity, unitPrice: s.unitPrice })),
      { couponCode, userId: input.userId },
    );

    const orderId = uuidv7();
    const [order] = await tx
      .insert(orders)
      .values({
        id: orderId,
        orderNumber: generateOrderNumber(orderId),
        userId: input.userId,
        status: "PENDING_PAYMENT",
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        shippingTotal: totals.shippingTotal,
        taxTotal: totals.taxTotal,
        grandTotal: totals.grandTotal,
        currency: totals.currency,
        couponCode: totals.appliedCoupon,
        shippingAddress,
      })
      .returning();

    await tx.insert(orderItems).values(
      snapshots.map((s) => ({
        orderId: order.id,
        variantId: s.variantId,
        productNameSnapshot: s.productName,
        variantNameSnapshot: s.variantName,
        skuSnapshot: s.sku,
        unitPrice: s.unitPrice,
        quantity: s.quantity,
        lineTotal: s.unitPrice * s.quantity,
      })),
    );

    await tx.insert(orderStatusHistory).values({
      orderId: order.id,
      fromStatus: null,
      toStatus: "PENDING_PAYMENT",
      note: "Order dibuat",
      actor: input.userId,
    });

    // Coupon redemption + usage count
    if (totals.appliedCoupon && totals.discountTotal > 0) {
      const coupon = await tx.query.coupons.findFirst({
        where: eq(coupons.code, totals.appliedCoupon),
      });
      if (coupon) {
        await tx
          .update(coupons)
          .set({ usedCount: sql`${coupons.usedCount} + 1` })
          .where(eq(coupons.id, coupon.id));
        await tx.insert(couponRedemptions).values({
          couponId: coupon.id,
          userId: input.userId,
          orderId: order.id,
          discountAmount: totals.discountTotal,
        });
      }
    }

    // Create payment intent (mock)
    const intent = await paymentProvider.createIntent({
      orderId: order.id,
      amount: order.grandTotal,
      currency: order.currency,
    });
    await tx.insert(payments).values({
      orderId: order.id,
      provider: paymentProvider.name,
      providerRef: intent.providerRef,
      amount: order.grandTotal,
      status: "INITIATED",
    });

    // Empty + close the cart
    await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    await tx.update(carts).set({ status: "CONVERTED", couponCode: null }).where(eq(carts.id, cart.id));

    return { order, redirectUrl: intent.redirectUrl };
  });
}

// re-export to keep a single import surface for callers
export { validateCoupon, slugify };
