"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  auditLogs,
  banners,
  blogPosts,
  cmsPages,
  faqs,
  flashSaleItems,
  flashSales,
  promotions,
  siteSettings,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { slugify } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Result helpers (mirrors src/server/actions/admin.ts)
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

function toDate(s?: string | null): Date | null {
  if (!s || !String(s).trim()) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function intOrZero(n: unknown): number {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? v : 0;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type BannerPlacementT = "HOME_HERO" | "HOME_STRIP" | "CATEGORY_TOP" | "CHECKOUT";
type ContentStatusT = "DRAFT" | "PUBLISHED";
type PromotionTypeT =
  | "CART_PERCENT"
  | "CART_FIXED"
  | "BUY_X_GET_Y"
  | "FREE_SHIPPING"
  | "BUNDLE";

const PLACEMENTS: BannerPlacementT[] = ["HOME_HERO", "HOME_STRIP", "CATEGORY_TOP", "CHECKOUT"];
const PROMO_TYPES: PromotionTypeT[] = [
  "CART_PERCENT",
  "CART_FIXED",
  "BUY_X_GET_Y",
  "FREE_SHIPPING",
  "BUNDLE",
];

// ---------------------------------------------------------------------------
// Banners
// ---------------------------------------------------------------------------
export type BannerInput = {
  title: string;
  imageUrl: string;
  mobileImageUrl?: string | null;
  linkUrl?: string | null;
  placement: BannerPlacementT;
  sortOrder?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive?: boolean;
};

function normalizeBanner(input: BannerInput): { ok: true; values: typeof banners.$inferInsert } | Err {
  const title = input.title?.trim();
  if (!title) return fail("Judul wajib diisi");
  const imageUrl = input.imageUrl?.trim();
  if (!imageUrl) return fail("URL gambar wajib diisi");
  if (!PLACEMENTS.includes(input.placement)) return fail("Penempatan tidak valid");
  return {
    ok: true,
    values: {
      title,
      imageUrl,
      mobileImageUrl: input.mobileImageUrl?.trim() || null,
      linkUrl: input.linkUrl?.trim() || null,
      placement: input.placement,
      sortOrder: intOrZero(input.sortOrder),
      startsAt: toDate(input.startsAt),
      endsAt: toDate(input.endsAt),
      isActive: input.isActive ?? true,
    },
  };
}

export async function createBanner(input: BannerInput): Promise<Result> {
  const admin = await requireAdmin();
  const norm = normalizeBanner(input);
  if (!norm.ok) return norm;
  try {
    const [created] = await db.insert(banners).values(norm.values).returning();
    await audit(admin.id, "banner.create", "banner", created.id, { title: norm.values.title });
    revalidatePath("/admin/content/banners");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return fail("Gagal membuat banner");
  }
}

export async function updateBanner(input: BannerInput & { id: string }): Promise<Result> {
  const admin = await requireAdmin();
  if (!input.id) return fail("ID banner tidak valid");
  const norm = normalizeBanner(input);
  if (!norm.ok) return norm;
  try {
    await db.update(banners).set(norm.values).where(eq(banners.id, input.id));
    await audit(admin.id, "banner.update", "banner", input.id, { title: norm.values.title });
    revalidatePath("/admin/content/banners");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return fail("Gagal memperbarui banner");
  }
}

export async function deleteBanner(id: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!id) return fail("ID banner tidak valid");
  try {
    await db.delete(banners).where(eq(banners.id, id));
    await audit(admin.id, "banner.delete", "banner", id);
    revalidatePath("/admin/content/banners");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return fail("Gagal menghapus banner");
  }
}

// ---------------------------------------------------------------------------
// CMS pages
// ---------------------------------------------------------------------------
export type CmsPageInput = {
  id?: string;
  slug?: string;
  title: string;
  content: string;
  status: ContentStatusT;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export async function upsertCmsPage(input: CmsPageInput): Promise<Result> {
  const admin = await requireAdmin();
  const title = input.title?.trim();
  if (!title) return fail("Judul wajib diisi");
  const status: ContentStatusT = input.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  const slug = (input.slug?.trim() ? slugify(input.slug) : slugify(title)) || slugify(title);
  if (!slug) return fail("Slug tidak valid");

  const values = {
    slug,
    title,
    content: input.content ?? "",
    status,
    seoTitle: input.seoTitle?.trim() || null,
    seoDescription: input.seoDescription?.trim() || null,
    publishedAt: status === "PUBLISHED" ? new Date() : null,
  };

  try {
    if (input.id) {
      await db.update(cmsPages).set(values).where(eq(cmsPages.id, input.id));
      await audit(admin.id, "cmsPage.update", "cms_page", input.id, { slug });
    } else {
      const [created] = await db.insert(cmsPages).values(values).returning();
      await audit(admin.id, "cmsPage.create", "cms_page", created.id, { slug });
    }
    revalidatePath("/admin/content/pages");
    revalidatePath(`/p/${slug}`);
    return { ok: true };
  } catch (e) {
    return fail(
      e instanceof Error && /unique/i.test(e.message) ? "Slug sudah dipakai" : "Gagal menyimpan halaman",
    );
  }
}

export async function deleteCmsPage(id: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!id) return fail("ID halaman tidak valid");
  try {
    await db.delete(cmsPages).where(eq(cmsPages.id, id));
    await audit(admin.id, "cmsPage.delete", "cms_page", id);
    revalidatePath("/admin/content/pages");
    return { ok: true };
  } catch {
    return fail("Gagal menghapus halaman");
  }
}

// ---------------------------------------------------------------------------
// Blog posts
// ---------------------------------------------------------------------------
export type BlogPostInput = {
  id?: string;
  slug?: string;
  title: string;
  excerpt?: string | null;
  coverImage?: string | null;
  body: string;
  tags?: string[];
  status: ContentStatusT;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export async function upsertBlogPost(input: BlogPostInput): Promise<Result> {
  const admin = await requireAdmin();
  const title = input.title?.trim();
  if (!title) return fail("Judul wajib diisi");
  const status: ContentStatusT = input.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  const slug = (input.slug?.trim() ? slugify(input.slug) : slugify(title)) || slugify(title);
  if (!slug) return fail("Slug tidak valid");
  const tags = (input.tags ?? []).map((t) => t.trim()).filter(Boolean);

  const values = {
    slug,
    title,
    excerpt: input.excerpt?.trim() || null,
    coverImage: input.coverImage?.trim() || null,
    body: input.body ?? "",
    authorId: admin.id,
    tags,
    status,
    publishedAt: status === "PUBLISHED" ? new Date() : null,
    seoTitle: input.seoTitle?.trim() || null,
    seoDescription: input.seoDescription?.trim() || null,
  };

  try {
    if (input.id) {
      await db.update(blogPosts).set(values).where(eq(blogPosts.id, input.id));
      await audit(admin.id, "blogPost.update", "blog_post", input.id, { slug });
    } else {
      const [created] = await db.insert(blogPosts).values(values).returning();
      await audit(admin.id, "blogPost.create", "blog_post", created.id, { slug });
    }
    revalidatePath("/admin/content/blog");
    revalidatePath("/blog");
    revalidatePath(`/blog/${slug}`);
    return { ok: true };
  } catch (e) {
    return fail(
      e instanceof Error && /unique/i.test(e.message) ? "Slug sudah dipakai" : "Gagal menyimpan artikel",
    );
  }
}

export async function deleteBlogPost(id: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!id) return fail("ID artikel tidak valid");
  try {
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
    await audit(admin.id, "blogPost.delete", "blog_post", id);
    revalidatePath("/admin/content/blog");
    revalidatePath("/blog");
    return { ok: true };
  } catch {
    return fail("Gagal menghapus artikel");
  }
}

// ---------------------------------------------------------------------------
// FAQs
// ---------------------------------------------------------------------------
export type FaqInput = {
  category: string;
  question: string;
  answer: string;
  sortOrder?: number;
  isActive?: boolean;
};

function normalizeFaq(input: FaqInput): { ok: true; values: typeof faqs.$inferInsert } | Err {
  const question = input.question?.trim();
  const answer = input.answer?.trim();
  if (!question) return fail("Pertanyaan wajib diisi");
  if (!answer) return fail("Jawaban wajib diisi");
  return {
    ok: true,
    values: {
      category: input.category?.trim() || "Umum",
      question,
      answer,
      sortOrder: intOrZero(input.sortOrder),
      isActive: input.isActive ?? true,
    },
  };
}

export async function createFaq(input: FaqInput): Promise<Result> {
  const admin = await requireAdmin();
  const norm = normalizeFaq(input);
  if (!norm.ok) return norm;
  try {
    const [created] = await db.insert(faqs).values(norm.values).returning();
    await audit(admin.id, "faq.create", "faq", created.id);
    revalidatePath("/admin/content/faq");
    revalidatePath("/faq");
    return { ok: true };
  } catch {
    return fail("Gagal membuat FAQ");
  }
}

export async function updateFaq(input: FaqInput & { id: string }): Promise<Result> {
  const admin = await requireAdmin();
  if (!input.id) return fail("ID FAQ tidak valid");
  const norm = normalizeFaq(input);
  if (!norm.ok) return norm;
  try {
    await db.update(faqs).set(norm.values).where(eq(faqs.id, input.id));
    await audit(admin.id, "faq.update", "faq", input.id);
    revalidatePath("/admin/content/faq");
    revalidatePath("/faq");
    return { ok: true };
  } catch {
    return fail("Gagal memperbarui FAQ");
  }
}

export async function deleteFaq(id: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!id) return fail("ID FAQ tidak valid");
  try {
    await db.delete(faqs).where(eq(faqs.id, id));
    await audit(admin.id, "faq.delete", "faq", id);
    revalidatePath("/admin/content/faq");
    revalidatePath("/faq");
    return { ok: true };
  } catch {
    return fail("Gagal menghapus FAQ");
  }
}

// ---------------------------------------------------------------------------
// Site settings (singleton)
// ---------------------------------------------------------------------------
export type SiteSettingsInput = {
  storeName?: string;
  currency?: string;
  contactEmail?: string;
  instagram?: string;
  twitter?: string;
  freeShippingThreshold?: number;
  taxRate?: number;
};

export async function updateSiteSettings(input: SiteSettingsInput): Promise<Result> {
  const admin = await requireAdmin();
  const data = {
    storeName: input.storeName?.trim() || "",
    currency: input.currency?.trim() || "IDR",
    contactEmail: input.contactEmail?.trim() || "",
    social: {
      instagram: input.instagram?.trim() || "",
      twitter: input.twitter?.trim() || "",
    },
    freeShippingThreshold: intOrZero(input.freeShippingThreshold),
    taxRate: Number.isFinite(Number(input.taxRate)) ? Number(input.taxRate) : 0,
  };
  try {
    await db
      .insert(siteSettings)
      .values({ id: "singleton", data })
      .onConflictDoUpdate({ target: siteSettings.id, set: { data } });
    await audit(admin.id, "siteSettings.update", "site_settings", "singleton");
    revalidatePath("/admin/content/settings");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return fail("Gagal menyimpan pengaturan");
  }
}

// ---------------------------------------------------------------------------
// Promotions (automatic)
// ---------------------------------------------------------------------------
export type PromotionInput = {
  name: string;
  type: PromotionTypeT;
  config: Record<string, unknown>;
  priority?: number;
  stackable?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive?: boolean;
};

function normalizePromotion(
  input: PromotionInput,
): { ok: true; values: typeof promotions.$inferInsert } | Err {
  const name = input.name?.trim();
  if (!name) return fail("Nama promo wajib diisi");
  if (!PROMO_TYPES.includes(input.type)) return fail("Tipe promo tidak valid");

  const raw = input.config ?? {};
  let config: Record<string, unknown> = {};
  switch (input.type) {
    case "FREE_SHIPPING":
      config = { threshold: intOrZero(raw.threshold) };
      break;
    case "CART_PERCENT":
      config = { percent: intOrZero(raw.percent), minSubtotal: intOrZero(raw.minSubtotal) };
      break;
    case "CART_FIXED":
      config = { amount: intOrZero(raw.amount), minSubtotal: intOrZero(raw.minSubtotal) };
      break;
    case "BUY_X_GET_Y":
      config = { buyQty: intOrZero(raw.buyQty), getQty: intOrZero(raw.getQty) };
      break;
    case "BUNDLE":
      config = { note: typeof raw.note === "string" ? raw.note : "" };
      break;
  }

  return {
    ok: true,
    values: {
      name,
      type: input.type,
      config,
      priority: intOrZero(input.priority),
      stackable: Boolean(input.stackable),
      startsAt: toDate(input.startsAt),
      endsAt: toDate(input.endsAt),
      isActive: input.isActive ?? true,
    },
  };
}

export async function createPromotion(input: PromotionInput): Promise<Result> {
  const admin = await requireAdmin();
  const norm = normalizePromotion(input);
  if (!norm.ok) return norm;
  try {
    const [created] = await db.insert(promotions).values(norm.values).returning();
    await audit(admin.id, "promotion.create", "promotion", created.id, { name: norm.values.name });
    revalidatePath("/admin/promotions/auto");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return fail("Gagal membuat promo");
  }
}

export async function updatePromotion(input: PromotionInput & { id: string }): Promise<Result> {
  const admin = await requireAdmin();
  if (!input.id) return fail("ID promo tidak valid");
  const norm = normalizePromotion(input);
  if (!norm.ok) return norm;
  try {
    await db.update(promotions).set(norm.values).where(eq(promotions.id, input.id));
    await audit(admin.id, "promotion.update", "promotion", input.id, { name: norm.values.name });
    revalidatePath("/admin/promotions/auto");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return fail("Gagal memperbarui promo");
  }
}

export async function deletePromotion(id: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!id) return fail("ID promo tidak valid");
  try {
    await db.delete(promotions).where(eq(promotions.id, id));
    await audit(admin.id, "promotion.delete", "promotion", id);
    revalidatePath("/admin/promotions/auto");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return fail("Gagal menghapus promo");
  }
}

// ---------------------------------------------------------------------------
// Flash sales
// ---------------------------------------------------------------------------
export type FlashSaleInput = {
  id?: string;
  name: string;
  bannerImage?: string | null;
  status: string;
  startsAt: string;
  endsAt: string;
};

const FLASH_STATUSES = ["SCHEDULED", "ACTIVE", "ENDED"];

export async function createFlashSale(input: FlashSaleInput): Promise<Result<{ id: string }>> {
  const admin = await requireAdmin();
  const name = input.name?.trim();
  if (!name) return fail("Nama flash sale wajib diisi");
  const startsAt = toDate(input.startsAt);
  const endsAt = toDate(input.endsAt);
  if (!startsAt || !endsAt) return fail("Jadwal mulai & selesai wajib diisi");
  if (endsAt <= startsAt) return fail("Waktu selesai harus setelah waktu mulai");
  const status = FLASH_STATUSES.includes(input.status) ? input.status : "SCHEDULED";
  try {
    const [created] = await db
      .insert(flashSales)
      .values({ name, bannerImage: input.bannerImage?.trim() || null, status, startsAt, endsAt })
      .returning();
    await audit(admin.id, "flashSale.create", "flash_sale", created.id, { name });
    revalidatePath("/admin/promotions/flash");
    revalidatePath("/");
    return { ok: true, id: created.id };
  } catch {
    return fail("Gagal membuat flash sale");
  }
}

export async function updateFlashSale(input: FlashSaleInput & { id: string }): Promise<Result> {
  const admin = await requireAdmin();
  if (!input.id) return fail("ID flash sale tidak valid");
  const name = input.name?.trim();
  if (!name) return fail("Nama flash sale wajib diisi");
  const startsAt = toDate(input.startsAt);
  const endsAt = toDate(input.endsAt);
  if (!startsAt || !endsAt) return fail("Jadwal mulai & selesai wajib diisi");
  if (endsAt <= startsAt) return fail("Waktu selesai harus setelah waktu mulai");
  const status = FLASH_STATUSES.includes(input.status) ? input.status : "SCHEDULED";
  try {
    await db
      .update(flashSales)
      .set({ name, bannerImage: input.bannerImage?.trim() || null, status, startsAt, endsAt })
      .where(eq(flashSales.id, input.id));
    await audit(admin.id, "flashSale.update", "flash_sale", input.id, { name });
    revalidatePath("/admin/promotions/flash");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return fail("Gagal memperbarui flash sale");
  }
}

// ---------------------------------------------------------------------------
// Flash sale items
// ---------------------------------------------------------------------------
export type FlashSaleItemInput = {
  flashSaleId: string;
  variantId: string;
  salePrice: number;
  stockLimit?: number;
};

export async function addFlashSaleItem(input: FlashSaleItemInput): Promise<Result> {
  const admin = await requireAdmin();
  if (!input.flashSaleId) return fail("ID flash sale tidak valid");
  if (!input.variantId) return fail("Varian wajib dipilih");
  const salePrice = Math.round(Number(input.salePrice));
  if (!Number.isFinite(salePrice) || salePrice < 0) return fail("Harga sale tidak valid");
  try {
    const [created] = await db
      .insert(flashSaleItems)
      .values({
        flashSaleId: input.flashSaleId,
        variantId: input.variantId,
        salePrice,
        stockLimit: intOrZero(input.stockLimit),
      })
      .returning();
    await audit(admin.id, "flashSaleItem.add", "flash_sale_item", created.id, {
      flashSaleId: input.flashSaleId,
    });
    revalidatePath("/admin/promotions/flash");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return fail("Gagal menambah item");
  }
}

export async function removeFlashSaleItem(id: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!id) return fail("ID item tidak valid");
  try {
    await db.delete(flashSaleItems).where(eq(flashSaleItems.id, id));
    await audit(admin.id, "flashSaleItem.remove", "flash_sale_item", id);
    revalidatePath("/admin/promotions/flash");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return fail("Gagal menghapus item");
  }
}
