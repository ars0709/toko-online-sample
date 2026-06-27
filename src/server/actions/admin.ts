"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  auditLogs,
  coupons,
  inventory,
  productImages,
  productVariants,
  products,
  reviews,
  apiKeys,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { slugify } from "@/lib/utils";
import { updateOrderStatus } from "@/server/services/orders";

// ---------------------------------------------------------------------------
// Result helpers
// ---------------------------------------------------------------------------
type Err = { ok: false; error: string };
export type Result<T = unknown> = ({ ok: true } & T) | Err;

async function audit(
  actor: string,
  action: string,
  entity: string,
  entityId: string | null,
  metadata?: Record<string, unknown>,
) {
  await db.insert(auditLogs).values({ actor, action, entity, entityId, metadata: metadata ?? null });
}

function fail(error: string): Err {
  return { ok: false, error };
}

type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
type CouponTypeT = "PERCENT" | "FIXED";
type ReviewStatusT = "PUBLISHED" | "REJECTED";

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
export async function createProduct(input: {
  name: string;
  slug?: string;
  brand?: string;
  description?: string;
  basePrice: number;
  status?: ProductStatus;
}): Promise<Result<{ id: string }>> {
  const admin = await requireAdmin();

  const name = input.name?.trim();
  if (!name) return fail("Nama produk wajib diisi");
  const basePrice = Math.round(Number(input.basePrice));
  if (!Number.isFinite(basePrice) || basePrice < 0) return fail("Harga tidak valid");

  const slug = (input.slug?.trim() ? slugify(input.slug) : slugify(name)) || slugify(name);

  try {
    const [created] = await db
      .insert(products)
      .values({
        name,
        slug,
        brand: input.brand?.trim() || null,
        description: input.description ?? "",
        basePrice,
        status: (input.status ?? "DRAFT") as ProductStatus,
      })
      .returning();

    // Always create a default variant + inventory so the product is sellable.
    const [variant] = await db
      .insert(productVariants)
      .values({
        productId: created.id,
        sku: `${slug}-default`.slice(0, 60),
        name: "Default",
        price: basePrice,
      })
      .returning();
    await db.insert(inventory).values({ variantId: variant.id, quantityOnHand: 0, quantityReserved: 0 });

    await audit(admin.id, "product.create", "product", created.id, { name, slug });
    revalidatePath("/admin/products");
    return { ok: true, id: created.id };
  } catch (e) {
    return fail(e instanceof Error && /unique/i.test(e.message) ? "Slug/SKU sudah dipakai" : "Gagal membuat produk");
  }
}

export async function updateProduct(input: {
  id: string;
  name: string;
  slug?: string;
  brand?: string;
  description?: string;
  basePrice: number;
  status?: ProductStatus;
  imageUrls?: string[];
}): Promise<Result> {
  const admin = await requireAdmin();
  if (!input.id) return fail("ID produk tidak valid");

  const name = input.name?.trim();
  if (!name) return fail("Nama produk wajib diisi");
  const basePrice = Math.round(Number(input.basePrice));
  if (!Number.isFinite(basePrice) || basePrice < 0) return fail("Harga tidak valid");
  const slug = (input.slug?.trim() ? slugify(input.slug) : slugify(name)) || slugify(name);

  try {
    await db
      .update(products)
      .set({
        name,
        slug,
        brand: input.brand?.trim() || null,
        description: input.description ?? "",
        basePrice,
        status: (input.status ?? "DRAFT") as ProductStatus,
      })
      .where(eq(products.id, input.id));

    if (input.imageUrls) {
      const urls = input.imageUrls.map((u) => u.trim()).filter(Boolean);
      await db.delete(productImages).where(eq(productImages.productId, input.id));
      if (urls.length) {
        await db.insert(productImages).values(
          urls.map((url, i) => ({ productId: input.id, url, sortOrder: i })),
        );
      }
    }

    await audit(admin.id, "product.update", "product", input.id, { name, slug });
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${input.id}/edit`);
    return { ok: true };
  } catch (e) {
    return fail(e instanceof Error && /unique/i.test(e.message) ? "Slug sudah dipakai" : "Gagal memperbarui produk");
  }
}

export async function upsertVariant(input: {
  productId: string;
  variantId?: string;
  sku: string;
  name: string;
  price: number;
  quantityOnHand: number;
}): Promise<Result> {
  const admin = await requireAdmin();
  if (!input.productId) return fail("ID produk tidak valid");

  const sku = input.sku?.trim();
  const vname = input.name?.trim();
  if (!sku || !vname) return fail("SKU dan nama varian wajib diisi");
  const price = Math.round(Number(input.price));
  const qty = Math.round(Number(input.quantityOnHand));
  if (!Number.isFinite(price) || price < 0) return fail("Harga varian tidak valid");
  if (!Number.isFinite(qty) || qty < 0) return fail("Stok tidak valid");

  try {
    if (input.variantId) {
      await db
        .update(productVariants)
        .set({ sku, name: vname, price })
        .where(eq(productVariants.id, input.variantId));
      const [inv] = await db
        .select()
        .from(inventory)
        .where(eq(inventory.variantId, input.variantId));
      if (inv) {
        await db.update(inventory).set({ quantityOnHand: qty }).where(eq(inventory.id, inv.id));
      } else {
        await db.insert(inventory).values({ variantId: input.variantId, quantityOnHand: qty });
      }
      await audit(admin.id, "variant.update", "product_variant", input.variantId, { sku });
    } else {
      const [variant] = await db
        .insert(productVariants)
        .values({ productId: input.productId, sku, name: vname, price })
        .returning();
      await db.insert(inventory).values({ variantId: variant.id, quantityOnHand: qty });
      await audit(admin.id, "variant.create", "product_variant", variant.id, { sku });
    }
    revalidatePath(`/admin/products/${input.productId}/edit`);
    return { ok: true };
  } catch (e) {
    return fail(e instanceof Error && /unique/i.test(e.message) ? "SKU sudah dipakai" : "Gagal menyimpan varian");
  }
}

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------
type CouponInput = {
  code: string;
  type: CouponTypeT;
  value: number;
  minSubtotal?: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  firstOrderOnly?: boolean;
  channel?: "PUBLIC" | "PRIVATE";
  isActive?: boolean;
};

type CouponValues = {
  code: string;
  type: CouponTypeT;
  value: number;
  minSubtotal: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  firstOrderOnly: boolean;
  channel: "PUBLIC" | "PRIVATE";
  isActive: boolean;
};

type NormResult = { ok: true; values: CouponValues } | { ok: false; error: string };

function normalizeCoupon(input: CouponInput): NormResult {
  const code = input.code?.trim().toUpperCase();
  if (!code) return { ok: false, error: "Kode kupon wajib diisi" };
  if (input.type !== "PERCENT" && input.type !== "FIXED")
    return { ok: false, error: "Tipe tidak valid" };
  const value = Math.round(Number(input.value));
  if (!Number.isFinite(value) || value <= 0) return { ok: false, error: "Nilai harus lebih dari 0" };
  if (input.type === "PERCENT" && value > 100) return { ok: false, error: "Persen maksimal 100" };
  return {
    ok: true,
    values: {
      code,
      type: input.type as CouponTypeT,
      value,
      minSubtotal: Math.max(0, Math.round(Number(input.minSubtotal ?? 0)) || 0),
      maxDiscount: input.maxDiscount != null ? Math.round(Number(input.maxDiscount)) : null,
      usageLimit: input.usageLimit != null ? Math.round(Number(input.usageLimit)) : null,
      perUserLimit: input.perUserLimit != null ? Math.round(Number(input.perUserLimit)) : null,
      firstOrderOnly: Boolean(input.firstOrderOnly),
      channel: input.channel === "PRIVATE" ? "PRIVATE" : "PUBLIC",
      isActive: input.isActive ?? true,
    },
  };
}

export async function createCoupon(input: CouponInput): Promise<Result> {
  const admin = await requireAdmin();
  const norm = normalizeCoupon(input);
  if (!norm.ok) return fail(norm.error);
  try {
    const [created] = await db.insert(coupons).values(norm.values).returning();
    await audit(admin.id, "coupon.create", "coupon", created.id, { code: norm.values.code });
    revalidatePath("/admin/coupons");
    return { ok: true };
  } catch (e) {
    return fail(e instanceof Error && /unique/i.test(e.message) ? "Kode kupon sudah ada" : "Gagal membuat kupon");
  }
}

export async function updateCoupon(input: CouponInput & { id: string }): Promise<Result> {
  const admin = await requireAdmin();
  if (!input.id) return fail("ID kupon tidak valid");
  const norm = normalizeCoupon(input);
  if (!norm.ok) return fail(norm.error);
  try {
    await db.update(coupons).set(norm.values).where(eq(coupons.id, input.id));
    await audit(admin.id, "coupon.update", "coupon", input.id, { code: norm.values.code });
    revalidatePath("/admin/coupons");
    return { ok: true };
  } catch (e) {
    return fail(e instanceof Error && /unique/i.test(e.message) ? "Kode kupon sudah ada" : "Gagal memperbarui kupon");
  }
}

export async function deleteCoupon(id: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!id) return fail("ID kupon tidak valid");
  try {
    await db.delete(coupons).where(eq(coupons.id, id));
    await audit(admin.id, "coupon.delete", "coupon", id);
    revalidatePath("/admin/coupons");
    return { ok: true };
  } catch {
    return fail("Gagal menghapus kupon");
  }
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
export async function moderateReview(id: string, status: ReviewStatusT): Promise<Result> {
  const admin = await requireAdmin();
  if (!id) return fail("ID ulasan tidak valid");
  if (status !== "PUBLISHED" && status !== "REJECTED") return fail("Status tidak valid");
  try {
    await db.update(reviews).set({ status }).where(eq(reviews.id, id));
    await audit(admin.id, "review.moderate", "review", id, { status });
    revalidatePath("/admin/reviews");
    return { ok: true };
  } catch {
    return fail("Gagal memperbarui ulasan");
  }
}

// ---------------------------------------------------------------------------
// API keys (admin oversight)
// ---------------------------------------------------------------------------
export async function revokeApiKeyAdmin(id: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!id) return fail("ID kunci tidak valid");
  try {
    await db.update(apiKeys).set({ revokedAt: new Date() }).where(eq(apiKeys.id, id));
    await audit(admin.id, "apikey.revoke", "api_key", id);
    revalidatePath("/admin/api-keys");
    return { ok: true };
  } catch {
    return fail("Gagal mencabut kunci");
  }
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
export async function updateOrderStatusAction(input: {
  orderId: string;
  toStatus: string;
  courier?: string;
  trackingNumber?: string;
  note?: string;
}): Promise<Result> {
  const admin = await requireAdmin();
  if (!input.orderId || !input.toStatus) return fail("Data tidak lengkap");
  try {
    await updateOrderStatus(input.orderId, input.toStatus, admin.id, {
      courier: input.courier?.trim() || undefined,
      trackingNumber: input.trackingNumber?.trim() || undefined,
      note: input.note?.trim() || undefined,
    });
    await audit(admin.id, "order.status", "order", input.orderId, { toStatus: input.toStatus });
    revalidatePath(`/admin/orders/${input.orderId}`);
    revalidatePath("/admin/orders");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal memperbarui status";
    if (msg.startsWith("INVALID_TRANSITION")) return fail("Transisi status tidak diizinkan");
    if (msg === "ORDER_NOT_FOUND") return fail("Pesanan tidak ditemukan");
    return fail("Gagal memperbarui status");
  }
}
