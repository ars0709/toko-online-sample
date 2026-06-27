import { and, eq, lte, gte, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { coupons, couponRedemptions, promotions } from "@/lib/db/schema";
import { env } from "@/lib/env";

export type PriceLine = { variantId: string; quantity: number; unitPrice: number };

export type Totals = {
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  currency: string;
  appliedCoupon: string | null;
  appliedPromotions: string[];
  freeShipping: boolean;
};

export type CouponValidation =
  | { valid: true; discount: number; coupon: { code: string; type: string; value: number } }
  | { valid: false; reason: string };

const now = () => new Date();

export async function validateCoupon(
  code: string,
  subtotal: number,
  userId?: string,
): Promise<CouponValidation> {
  const coupon = await db.query.coupons.findFirst({ where: eq(coupons.code, code.toUpperCase()) });
  if (!coupon || !coupon.isActive) return { valid: false, reason: "Kupon tidak ditemukan" };
  const t = now();
  if (coupon.startsAt && coupon.startsAt > t) return { valid: false, reason: "Kupon belum berlaku" };
  if (coupon.endsAt && coupon.endsAt < t) return { valid: false, reason: "Kupon sudah berakhir" };
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit)
    return { valid: false, reason: "Kuota kupon habis" };
  if (subtotal < coupon.minSubtotal)
    return { valid: false, reason: `Minimal belanja Rp${coupon.minSubtotal.toLocaleString("id-ID")}` };

  if (userId) {
    if (coupon.perUserLimit !== null) {
      const used = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(couponRedemptions)
        .where(and(eq(couponRedemptions.couponId, coupon.id), eq(couponRedemptions.userId, userId)));
      if ((used[0]?.c ?? 0) >= coupon.perUserLimit)
        return { valid: false, reason: "Batas pemakaian kupon tercapai" };
    }
  }

  let discount =
    coupon.type === "PERCENT" ? Math.floor((subtotal * coupon.value) / 100) : coupon.value;
  if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(discount, subtotal);

  return {
    valid: true,
    discount,
    coupon: { code: coupon.code, type: coupon.type, value: coupon.value },
  };
}

async function activePromotions() {
  const t = now();
  return db
    .select()
    .from(promotions)
    .where(
      and(
        eq(promotions.isActive, true),
        or(isNull(promotions.startsAt), lte(promotions.startsAt, t)),
        or(isNull(promotions.endsAt), gte(promotions.endsAt, t)),
      ),
    );
}

export async function computeTotals(
  lines: PriceLine[],
  opts: { couponCode?: string | null; userId?: string; currency?: string } = {},
): Promise<Totals> {
  const currency = opts.currency ?? "IDR";
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  let discountTotal = 0;
  let freeShipping = false;
  const appliedPromotions: string[] = [];

  // --- automatic promotions ---
  for (const p of await activePromotions()) {
    const cfg = (p.config ?? {}) as Record<string, unknown>;
    if (p.type === "FREE_SHIPPING") {
      const threshold = Number(cfg.threshold ?? env.FREE_SHIPPING_THRESHOLD);
      if (subtotal >= threshold) {
        freeShipping = true;
        appliedPromotions.push(p.name);
      }
    } else if (p.type === "CART_PERCENT") {
      const min = Number(cfg.minSubtotal ?? 0);
      if (subtotal >= min) {
        discountTotal += Math.floor((subtotal * Number(cfg.percent ?? 0)) / 100);
        appliedPromotions.push(p.name);
      }
    } else if (p.type === "CART_FIXED") {
      const min = Number(cfg.minSubtotal ?? 0);
      if (subtotal >= min) {
        discountTotal += Number(cfg.amount ?? 0);
        appliedPromotions.push(p.name);
      }
    }
  }

  // env-level free-shipping threshold as an implicit promotion
  if (!freeShipping && subtotal >= env.FREE_SHIPPING_THRESHOLD) freeShipping = true;

  // --- manual coupon (stacks on top of auto promos) ---
  let appliedCoupon: string | null = null;
  if (opts.couponCode) {
    const v = await validateCoupon(opts.couponCode, subtotal, opts.userId);
    if (v.valid) {
      discountTotal += v.discount;
      appliedCoupon = v.coupon.code;
    }
  }

  discountTotal = Math.min(discountTotal, subtotal);

  const shippingTotal = subtotal === 0 || freeShipping ? 0 : env.SHIPPING_FLAT;
  const taxableBase = Math.max(0, subtotal - discountTotal);
  const taxTotal = Math.round(taxableBase * env.TAX_RATE);
  const grandTotal = taxableBase + shippingTotal + taxTotal;

  return {
    subtotal,
    discountTotal,
    shippingTotal,
    taxTotal,
    grandTotal,
    currency,
    appliedCoupon,
    appliedPromotions,
    freeShipping,
  };
}
