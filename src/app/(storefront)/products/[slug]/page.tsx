import { notFound } from "next/navigation";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { Star } from "lucide-react";
import { db } from "@/lib/db";
import { reviews, users } from "@/lib/db/schema";
import { getProductBySlug } from "@/server/services/catalog";
import { AddToCart } from "@/components/add-to-cart";
import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/utils";
import { ProductGallery } from "@/components/product-gallery";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  return { title: p?.name ?? "Produk", description: p?.description?.slice(0, 150) };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const productReviews = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      createdAt: reviews.createdAt,
      author: users.name,
    })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .where(and(eq(reviews.productId, product.id), eq(reviews.status, "PUBLISHED")))
    .orderBy(desc(reviews.createdAt))
    .limit(10);

  return (
    <div className="container-page py-8">
      <nav className="text-sm text-[var(--muted-foreground)] mb-6">
        <Link href="/products" className="hover:text-[var(--foreground)]">Produk</Link>
        <span className="mx-2">/</span>
        <span>{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8">
        <ProductGallery images={product.images.map((i) => ({ url: i.url, alt: i.alt ?? product.name }))} />

        <div>
          {product.brand && <div className="text-sm text-[var(--muted-foreground)]">{product.brand}</div>}
          <h1 className="text-2xl md:text-3xl font-bold">{product.name}</h1>
          <div className="mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1 text-sm">
              <Star className="size-4 fill-amber-400 text-amber-400" />
              {(product.ratingAvg / 10).toFixed(1)}
              <span className="text-[var(--muted-foreground)]">({product.ratingCount} ulasan)</span>
            </span>
            {product.categories.map((c) => (
              <Badge key={c.id} variant="secondary">{c.name}</Badge>
            ))}
          </div>

          <div className="mt-4 text-3xl font-bold text-[var(--primary)]">
            {formatIDR(product.basePrice)}
          </div>

          <p className="mt-4 text-sm text-[var(--muted-foreground)] leading-relaxed">
            {product.description}
          </p>

          <div className="mt-6 border-t border-[var(--border)] pt-6">
            <AddToCart
              variants={product.variants.map((v) => ({
                id: v.id,
                name: v.name,
                price: v.price,
                available: v.available,
              }))}
            />
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-12">
        <h2 className="text-xl font-bold mb-4">Ulasan Pembeli</h2>
        {productReviews.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">Belum ada ulasan untuk produk ini.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {productReviews.map((r) => (
              <div key={r.id} className="rounded-lg border border-[var(--border)] p-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{r.author}</span>
                  <span className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`size-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-[var(--muted-foreground)]"}`} />
                    ))}
                  </span>
                </div>
                {r.title && <div className="mt-1 font-medium text-sm">{r.title}</div>}
                {r.body && <p className="mt-1 text-sm text-[var(--muted-foreground)]">{r.body}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
