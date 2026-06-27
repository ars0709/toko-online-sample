import Link from "next/link";
import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { ArrowRight, Zap } from "lucide-react";
import { db } from "@/lib/db";
import { banners, flashSaleItems, flashSales, productImages, productVariants, products } from "@/lib/db/schema";
import { listCategories, listProducts } from "@/server/services/catalog";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getHero() {
  const rows = await db
    .select()
    .from(banners)
    .where(and(eq(banners.isActive, true), eq(banners.placement, "HOME_HERO")))
    .orderBy(asc(banners.sortOrder));
  return rows[0] ?? null;
}

async function getFlashSale() {
  const now = new Date();
  const sale = await db.query.flashSales.findFirst({
    where: and(lte(flashSales.startsAt, now), gte(flashSales.endsAt, now)),
  });
  if (!sale) return null;
  const items = await db
    .select({
      salePrice: flashSaleItems.salePrice,
      stockLimit: flashSaleItems.stockLimit,
      soldCount: flashSaleItems.soldCount,
      variantPrice: productVariants.price,
      productName: products.name,
      productSlug: products.slug,
      productId: products.id,
    })
    .from(flashSaleItems)
    .innerJoin(productVariants, eq(productVariants.id, flashSaleItems.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(eq(flashSaleItems.flashSaleId, sale.id));

  const ids = items.map((i) => i.productId);
  const imgs = ids.length
    ? await db.select().from(productImages).where(inArray(productImages.productId, ids))
    : [];
  const imgMap = new Map<string, string>();
  for (const im of imgs.sort((a, b) => a.sortOrder - b.sortOrder))
    if (!imgMap.has(im.productId)) imgMap.set(im.productId, im.url);

  return { sale, items: items.map((i) => ({ ...i, image: imgMap.get(i.productId) ?? null })) };
}

export default async function HomePage() {
  const [hero, cats, latest, flash] = await Promise.all([
    getHero(),
    listCategories(),
    listProducts({ sort: "newest", limit: 8 }),
    getFlashSale(),
  ]);

  return (
    <div className="container-page py-8 space-y-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
        <div className="grid md:grid-cols-2 items-center">
          <div className="p-8 md:p-12 space-y-4">
            <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
              Belanja Mudah & Aman
            </span>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight">
              {hero?.title ?? "Temukan Produk Favoritmu"}
            </h1>
            <p className="text-white/80 max-w-md">
              Ribuan produk pilihan, gratis ongkir, dan promo setiap hari. Checkout cepat dengan
              pembayaran aman.
            </p>
            <div className="flex gap-3 pt-2">
              <Button asChild size="lg" variant="secondary">
                <Link href="/products">Belanja Sekarang <ArrowRight /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10">
                <Link href="/promo">Lihat Promo</Link>
              </Button>
            </div>
          </div>
          <div className="hidden md:block h-full min-h-72">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero?.imageUrl ?? "https://picsum.photos/seed/hero/900/600"} alt="" className="h-full w-full object-cover" />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section>
        <h2 className="text-xl font-bold mb-4">Kategori Pilihan</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {cats.map((c) => (
            <Link
              key={c.id}
              href={`/products?category=${c.slug}`}
              className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-center hover:border-[var(--primary)] transition-colors"
            >
              <div className="aspect-square rounded-md overflow-hidden bg-[var(--muted)] mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.imageUrl ?? ""} alt={c.name} className="h-full w-full object-cover" />
              </div>
              <span className="text-xs font-medium">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Flash sale */}
      {flash && flash.items.length > 0 && (
        <section className="rounded-2xl border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="size-5 text-amber-500 fill-amber-500" />
            <h2 className="text-xl font-bold">{flash.sale.name}</h2>
            <span className="text-sm text-[var(--muted-foreground)]">— berakhir hari ini</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {flash.items.map((i, idx) => {
              const pct = i.stockLimit > 0 ? Math.min(100, Math.round((i.soldCount / i.stockLimit) * 100)) : 0;
              return (
                <Link key={idx} href={`/products/${i.productSlug}`} className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
                  <div className="aspect-square bg-[var(--muted)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={i.image ?? ""} alt={i.productName} className="h-full w-full object-cover" />
                  </div>
                  <div className="p-2">
                    <div className="line-clamp-1 text-xs font-medium">{i.productName}</div>
                    <div className="text-sm font-bold text-amber-600">{formatIDR(i.salePrice)}</div>
                    <div className="text-[10px] text-[var(--muted-foreground)] line-through">{formatIDR(i.variantPrice)}</div>
                    <div className="mt-1 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Terjual {i.soldCount}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Latest products */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Produk Terbaru</h2>
          <Link href="/products" className="text-sm text-[var(--primary)] hover:underline flex items-center gap-1">
            Lihat semua <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {latest.items.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
