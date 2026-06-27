"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { CART_COOKIE } from "@/lib/cart-context";
import {
  addItem,
  getOrCreateCart,
  newCartToken,
  removeItem,
  setCoupon,
  updateItem,
} from "@/server/services/cart";
import { validateCoupon } from "@/server/services/pricing";
import { env } from "@/lib/env";

type ActionResult = { ok: true } | { ok: false; error: string };

async function ensureCartId(): Promise<string> {
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  const user = await getCurrentUser();
  const cart = await getOrCreateCart({ userId: user?.id ?? null, cartToken: token ?? null });
  if (cart.cartToken !== token) {
    jar.set(CART_COOKIE, cart.cartToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.APP_URL.startsWith("https"),
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return cart.id;
}

const messages: Record<string, string> = {
  INSUFFICIENT_STOCK: "Stok tidak mencukupi",
  VARIANT_NOT_FOUND: "Varian tidak ditemukan",
  ITEM_NOT_FOUND: "Item tidak ditemukan",
};

export async function addToCartAction(variantId: string, quantity: number): Promise<ActionResult> {
  try {
    const cartId = await ensureCartId();
    await addItem(cartId, variantId, quantity);
    revalidatePath("/cart");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: messages[(e as Error).message] ?? "Gagal menambah ke keranjang" };
  }
}

export async function updateCartItemAction(itemId: string, quantity: number): Promise<ActionResult> {
  try {
    const cartId = await ensureCartId();
    await updateItem(cartId, itemId, quantity);
    revalidatePath("/cart");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: messages[(e as Error).message] ?? "Gagal memperbarui" };
  }
}

export async function removeCartItemAction(itemId: string): Promise<ActionResult> {
  try {
    const cartId = await ensureCartId();
    await removeItem(cartId, itemId);
    revalidatePath("/cart");
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal menghapus item" };
  }
}

export async function applyCouponAction(code: string): Promise<ActionResult> {
  try {
    const cartId = await ensureCartId();
    const user = await getCurrentUser();
    // validate against current subtotal
    const { getCartView } = await import("@/server/services/cart");
    const view = await getCartView(cartId, user?.id);
    const v = await validateCoupon(code, view.totals.subtotal, user?.id);
    if (!v.valid) return { ok: false, error: v.reason };
    await setCoupon(cartId, code);
    revalidatePath("/cart");
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal menerapkan kupon" };
  }
}

export async function removeCouponAction(): Promise<ActionResult> {
  try {
    const cartId = await ensureCartId();
    await setCoupon(cartId, null);
    revalidatePath("/cart");
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal" };
  }
}

export { newCartToken };
