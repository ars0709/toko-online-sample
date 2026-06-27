import { and, eq, inArray } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import {
  cartItems,
  carts,
  inventory,
  productImages,
  productVariants,
  products,
} from "@/lib/db/schema";
import { computeTotals, type Totals } from "./pricing";

export type CartRow = typeof carts.$inferSelect;

export function newCartToken() {
  return `ct_${randomBytes(18).toString("base64url")}`;
}

export async function getOrCreateCart(opts: {
  userId?: string | null;
  cartToken?: string | null;
}): Promise<CartRow> {
  const { userId, cartToken } = opts;

  if (cartToken) {
    const existing = await db.query.carts.findFirst({ where: eq(carts.cartToken, cartToken) });
    if (existing) {
      // attach to user on first authenticated access
      if (userId && !existing.userId) {
        const [updated] = await db
          .update(carts)
          .set({ userId })
          .where(eq(carts.id, existing.id))
          .returning();
        return updated;
      }
      return existing;
    }
  }

  if (userId) {
    const userCart = await db.query.carts.findFirst({
      where: and(eq(carts.userId, userId), eq(carts.status, "ACTIVE")),
    });
    if (userCart) return userCart;
  }

  const [created] = await db
    .insert(carts)
    .values({
      userId: userId ?? null,
      cartToken: cartToken ?? newCartToken(),
      status: "ACTIVE",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    })
    .returning();
  return created;
}

async function variantWithStock(variantId: string) {
  const variant = await db.query.productVariants.findFirst({
    where: eq(productVariants.id, variantId),
  });
  if (!variant) return null;
  const inv = await db.query.inventory.findFirst({ where: eq(inventory.variantId, variantId) });
  const available = inv ? inv.quantityOnHand - inv.quantityReserved : 0;
  return { variant, available: Math.max(0, available) };
}

export async function addItem(cartId: string, variantId: string, quantity: number) {
  const data = await variantWithStock(variantId);
  if (!data) throw new Error("VARIANT_NOT_FOUND");

  const existing = await db.query.cartItems.findFirst({
    where: and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId)),
  });
  const desired = (existing?.quantity ?? 0) + quantity;
  if (desired > data.available) throw new Error("INSUFFICIENT_STOCK");

  if (existing) {
    await db.update(cartItems).set({ quantity: desired }).where(eq(cartItems.id, existing.id));
  } else {
    await db.insert(cartItems).values({
      cartId,
      variantId,
      quantity,
      unitPriceSnapshot: data.variant.price,
    });
  }
}

export async function updateItem(cartId: string, itemId: string, quantity: number) {
  const item = await db.query.cartItems.findFirst({
    where: and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)),
  });
  if (!item) throw new Error("ITEM_NOT_FOUND");
  if (quantity <= 0) {
    await db.delete(cartItems).where(eq(cartItems.id, itemId));
    return;
  }
  const data = await variantWithStock(item.variantId);
  if (data && quantity > data.available) throw new Error("INSUFFICIENT_STOCK");
  await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, itemId));
}

export async function removeItem(cartId: string, itemId: string) {
  await db.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
}

export async function setCoupon(cartId: string, code: string | null) {
  await db
    .update(carts)
    .set({ couponCode: code ? code.toUpperCase() : null })
    .where(eq(carts.id, cartId));
}

export type CartView = {
  id: string;
  cartToken: string;
  couponCode: string | null;
  items: Array<{
    id: string;
    variantId: string;
    productName: string;
    productSlug: string;
    variantName: string;
    sku: string;
    image: string | null;
    unitPrice: number;
    quantity: number;
    available: number;
    lineTotal: number;
  }>;
  totals: Totals;
};

export async function getCartView(cartId: string, userId?: string): Promise<CartView> {
  const cart = await db.query.carts.findFirst({ where: eq(carts.id, cartId) });
  if (!cart) throw new Error("CART_NOT_FOUND");

  const items = await db.select().from(cartItems).where(eq(cartItems.cartId, cartId));
  const variantIds = items.map((i) => i.variantId);

  const variants = variantIds.length
    ? await db
        .select({
          id: productVariants.id,
          name: productVariants.name,
          sku: productVariants.sku,
          price: productVariants.price,
          productId: productVariants.productId,
          productName: products.name,
          productSlug: products.slug,
        })
        .from(productVariants)
        .innerJoin(products, eq(products.id, productVariants.productId))
        .where(inArray(productVariants.id, variantIds))
    : [];
  const variantMap = new Map(variants.map((v) => [v.id, v]));

  const inv = variantIds.length
    ? await db.select().from(inventory).where(inArray(inventory.variantId, variantIds))
    : [];
  const invMap = new Map(inv.map((i) => [i.variantId, i]));

  const productIds = [...new Set(variants.map((v) => v.productId))];
  const imgs = productIds.length
    ? await db.select().from(productImages).where(inArray(productImages.productId, productIds))
    : [];
  const imgMap = new Map<string, string>();
  for (const im of imgs.sort((a, b) => a.sortOrder - b.sortOrder))
    if (!imgMap.has(im.productId)) imgMap.set(im.productId, im.url);

  const viewItems = items
    .filter((i) => variantMap.has(i.variantId))
    .map((i) => {
      const v = variantMap.get(i.variantId)!;
      const iv = invMap.get(i.variantId);
      const available = iv ? Math.max(0, iv.quantityOnHand - iv.quantityReserved) : 0;
      return {
        id: i.id,
        variantId: i.variantId,
        productName: v.productName,
        productSlug: v.productSlug,
        variantName: v.name,
        sku: v.sku,
        image: imgMap.get(v.productId) ?? null,
        unitPrice: i.unitPriceSnapshot,
        quantity: i.quantity,
        available,
        lineTotal: i.unitPriceSnapshot * i.quantity,
      };
    });

  const totals = await computeTotals(
    viewItems.map((i) => ({ variantId: i.variantId, quantity: i.quantity, unitPrice: i.unitPrice })),
    { couponCode: cart.couponCode, userId },
  );

  return {
    id: cart.id,
    cartToken: cart.cartToken,
    couponCode: cart.couponCode,
    items: viewItems,
    totals,
  };
}

export async function cartItemCount(cartId: string): Promise<number> {
  const items = await db.select().from(cartItems).where(eq(cartItems.cartId, cartId));
  return items.reduce((s, i) => s + i.quantity, 0);
}

/** Merge a guest cart's items into the user's active cart, then delete the guest cart. */
export async function mergeGuestIntoUser(guestToken: string, userId: string) {
  const guest = await db.query.carts.findFirst({ where: eq(carts.cartToken, guestToken) });
  if (!guest || guest.userId === userId) return;
  const target = await getOrCreateCart({ userId });
  if (target.id === guest.id) return;
  const guestItems = await db.select().from(cartItems).where(eq(cartItems.cartId, guest.id));
  for (const gi of guestItems) {
    try {
      await addItem(target.id, gi.variantId, gi.quantity);
    } catch {
      /* skip items that no longer fit stock */
    }
  }
  await db.delete(carts).where(eq(carts.id, guest.id));
}
