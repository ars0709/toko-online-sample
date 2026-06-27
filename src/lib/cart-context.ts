import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { carts } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getCartView, type CartView } from "@/server/services/cart";

export const CART_COOKIE = "toko_cart";

/** Read the current cart (no creation/cookie writes — safe in RSC render). */
export async function readCart(): Promise<CartView | null> {
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  const user = await getCurrentUser();

  let cartId: string | null = null;
  if (token) {
    const c = await db.query.carts.findFirst({ where: eq(carts.cartToken, token) });
    if (c && c.status === "ACTIVE") cartId = c.id;
  }
  if (!cartId && user) {
    const c = await db.query.carts.findFirst({ where: eq(carts.userId, user.id) });
    if (c && c.status === "ACTIVE") cartId = c.id;
  }
  if (!cartId) return null;
  return getCartView(cartId, user?.id);
}

export async function readCartCount(): Promise<number> {
  const view = await readCart();
  if (!view) return 0;
  return view.items.reduce((s, i) => s + i.quantity, 0);
}
