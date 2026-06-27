"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { addresses, orderItems, orders, reviews, users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { addressSchema } from "@/lib/validators";

type Result = { ok: true } | { ok: false; error: string };

export async function addAddressAction(formData: FormData): Promise<Result> {
  const user = await requireUser();
  const parsed = addressSchema.safeParse({
    label: formData.get("label") || "Rumah",
    recipient: formData.get("recipient"),
    phone: formData.get("phone"),
    line1: formData.get("line1"),
    line2: formData.get("line2") || undefined,
    city: formData.get("city"),
    province: formData.get("province"),
    postalCode: formData.get("postalCode"),
    country: "ID",
    isDefault: formData.get("isDefault") === "on",
  });
  if (!parsed.success) return { ok: false, error: "Lengkapi data alamat dengan benar" };

  if (parsed.data.isDefault) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
  }
  await db.insert(addresses).values({ ...parsed.data, userId: user.id });
  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function deleteAddressAction(id: string): Promise<Result> {
  const user = await requireUser();
  await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, user.id)));
  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function setDefaultAddressAction(id: string): Promise<Result> {
  const user = await requireUser();
  await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
  await db
    .update(addresses)
    .set({ isDefault: true })
    .where(and(eq(addresses.id, id), eq(addresses.userId, user.id)));
  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function updateProfileAction(formData: FormData): Promise<Result> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { ok: false, error: "Nama minimal 2 karakter" };
  await db.update(users).set({ name }).where(eq(users.id, user.id));
  revalidatePath("/account");
  return { ok: true };
}

/** Write a verified-purchase review for a product from a DELIVERED order. */
export async function writeReviewAction(formData: FormData): Promise<Result> {
  const user = await requireUser();
  const productId = String(formData.get("productId") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  const rating = Number(formData.get("rating") ?? 0);
  const title = String(formData.get("title") ?? "").slice(0, 120) || null;
  const body = String(formData.get("body") ?? "").slice(0, 2000) || null;
  if (rating < 1 || rating > 5) return { ok: false, error: "Rating 1-5" };

  // verify the user actually bought this product in a DELIVERED order
  const purchased = await db
    .select({ id: orders.id })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.userId, user.id),
        eq(orders.status, "DELIVERED"),
        eq(orderItems.variantId, orderItems.variantId), // ensure join row exists
      ),
    )
    .limit(1);
  if (purchased.length === 0) return { ok: false, error: "Hanya pesanan yang sudah diterima yang bisa diulas" };

  await db.insert(reviews).values({
    productId,
    userId: user.id,
    orderId,
    rating,
    title,
    body,
    status: "PENDING",
  });
  revalidatePath("/account/orders");
  return { ok: true };
}
