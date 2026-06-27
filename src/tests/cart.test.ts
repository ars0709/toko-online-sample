import { describe, it, expect, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { productVariants, carts } from "@/lib/db/schema";
import { addItem, getCartView, getOrCreateCart, removeItem, updateItem } from "@/server/services/cart";

describe("cart service", () => {
  let cartId = "";

  afterAll(async () => {
    if (cartId) await db.delete(carts).where(eq(carts.id, cartId));
  });

  it("adds, updates and removes items with correct totals", async () => {
    const variant = await db.query.productVariants.findFirst();
    expect(variant).toBeTruthy();

    const cart = await getOrCreateCart({ cartToken: `test_${Date.now()}` });
    cartId = cart.id;

    await addItem(cartId, variant!.id, 2);
    let view = await getCartView(cartId);
    expect(view.items).toHaveLength(1);
    expect(view.items[0].quantity).toBe(2);
    expect(view.totals.subtotal).toBe(variant!.price * 2);

    await updateItem(cartId, view.items[0].id, 3);
    view = await getCartView(cartId);
    expect(view.items[0].quantity).toBe(3);

    await removeItem(cartId, view.items[0].id);
    view = await getCartView(cartId);
    expect(view.items).toHaveLength(0);
  });

  it("rejects quantities beyond available stock", async () => {
    const variant = await db.query.productVariants.findFirst();
    const cart = await getOrCreateCart({ cartToken: `test_stock_${Date.now()}` });
    await expect(addItem(cart.id, variant!.id, 100_000)).rejects.toThrow("INSUFFICIENT_STOCK");
    await db.delete(carts).where(eq(carts.id, cart.id));
  });
});
