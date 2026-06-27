import { and, asc, desc, eq, gte, isNull, lte, sql, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  categories,
  inventory,
  productCategories,
  productImages,
  productVariants,
  products,
} from "@/lib/db/schema";
import type { ProductQuery } from "@/lib/validators";

export type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  basePrice: number;
  currency: string;
  ratingAvg: number;
  ratingCount: number;
  image: string | null;
};

export async function listProducts(q: ProductQuery) {
  const where = [eq(products.status, "ACTIVE"), isNull(products.deletedAt)];

  if (q.search) {
    where.push(
      sql`to_tsvector('simple', coalesce(${products.name},'') || ' ' || coalesce(${products.brand},'') || ' ' || coalesce(${products.description},'')) @@ plainto_tsquery('simple', ${q.search})`,
    );
  }
  if (q.brand) where.push(eq(products.brand, q.brand));
  if (typeof q.minPrice === "number") where.push(gte(products.basePrice, q.minPrice));
  if (typeof q.maxPrice === "number") where.push(lte(products.basePrice, q.maxPrice));

  let productIdsForCategory: string[] | null = null;
  if (q.category) {
    const cat = await db.query.categories.findFirst({
      where: eq(categories.slug, q.category),
    });
    if (cat) {
      const rows = await db
        .select({ productId: productCategories.productId })
        .from(productCategories)
        .where(eq(productCategories.categoryId, cat.id));
      productIdsForCategory = rows.map((r) => r.productId);
      if (productIdsForCategory.length === 0) return { items: [], nextCursor: null, hasMore: false };
      where.push(inArray(products.id, productIdsForCategory));
    } else {
      return { items: [], nextCursor: null, hasMore: false };
    }
  }

  // keyset pagination on (price/createdAt, id) depending on sort
  const orderBy =
    q.sort === "price_asc"
      ? [asc(products.basePrice), asc(products.id)]
      : q.sort === "price_desc"
        ? [desc(products.basePrice), desc(products.id)]
        : q.sort === "rating"
          ? [desc(products.ratingAvg), desc(products.id)]
          : [desc(products.createdAt), desc(products.id)];

  if (q.cursor) {
    // cursor is the last product id; for simplicity use createdAt-based offset via id compare
    where.push(sql`${products.id} < ${q.cursor}`);
  }

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      brand: products.brand,
      basePrice: products.basePrice,
      currency: products.currency,
      ratingAvg: products.ratingAvg,
      ratingCount: products.ratingCount,
    })
    .from(products)
    .where(and(...where))
    .orderBy(...orderBy)
    .limit(q.limit + 1);

  const hasMore = rows.length > q.limit;
  const page = rows.slice(0, q.limit);

  // attach primary image
  const ids = page.map((p) => p.id);
  const imgs = ids.length
    ? await db
        .select({
          productId: productImages.productId,
          url: productImages.url,
          sortOrder: productImages.sortOrder,
        })
        .from(productImages)
        .where(inArray(productImages.productId, ids))
        .orderBy(asc(productImages.sortOrder))
    : [];
  const imgByProduct = new Map<string, string>();
  for (const img of imgs) if (!imgByProduct.has(img.productId)) imgByProduct.set(img.productId, img.url);

  const items: ProductListItem[] = page.map((p) => ({
    ...p,
    image: imgByProduct.get(p.id) ?? null,
  }));

  return {
    items,
    nextCursor: hasMore ? page[page.length - 1].id : null,
    hasMore,
  };
}

export async function getProductBySlug(slug: string) {
  const product = await db.query.products.findFirst({
    where: and(eq(products.slug, slug), isNull(products.deletedAt)),
  });
  if (!product) return null;

  const [images, variants, cats] = await Promise.all([
    db.select().from(productImages).where(eq(productImages.productId, product.id)).orderBy(asc(productImages.sortOrder)),
    db.select().from(productVariants).where(eq(productVariants.productId, product.id)),
    db
      .select({ id: categories.id, name: categories.name, slug: categories.slug })
      .from(productCategories)
      .innerJoin(categories, eq(categories.id, productCategories.categoryId))
      .where(eq(productCategories.productId, product.id)),
  ]);

  const variantIds = variants.map((v) => v.id);
  const inv = variantIds.length
    ? await db.select().from(inventory).where(inArray(inventory.variantId, variantIds))
    : [];
  const invByVariant = new Map(inv.map((i) => [i.variantId, i]));

  return {
    ...product,
    images,
    categories: cats,
    variants: variants.map((v) => {
      const i = invByVariant.get(v.id);
      const available = i ? i.quantityOnHand - i.quantityReserved : 0;
      return { ...v, available: Math.max(0, available) };
    }),
  };
}

export async function listCategories() {
  return db.select().from(categories).orderBy(asc(categories.name));
}
