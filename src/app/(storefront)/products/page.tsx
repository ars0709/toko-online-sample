import Link from "next/link";
import { listCategories, listProducts } from "@/server/services/catalog";
import { productQuerySchema } from "@/lib/validators";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = { title: "Semua Produk" };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const parsed = productQuerySchema.parse({
    search: sp.search,
    category: sp.category,
    brand: sp.brand,
    minPrice: sp.minPrice,
    maxPrice: sp.maxPrice,
    sort: sp.sort ?? "newest",
    cursor: sp.cursor,
    limit: 12,
  });

  const [{ items, nextCursor, hasMore }, cats] = await Promise.all([
    listProducts(parsed),
    listCategories(),
  ]);

  const sorts: [string, string][] = [
    ["newest", "Terbaru"],
    ["price_asc", "Harga Termurah"],
    ["price_desc", "Harga Tertinggi"],
    ["rating", "Rating Tertinggi"],
  ];

  function buildHref(extra: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { ...sp, ...extra } as Record<string, string | undefined>;
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, String(v));
    return `/products?${params.toString()}`;
  }

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold mb-6">Semua Produk</h1>
      <div className="grid md:grid-cols-[240px_1fr] gap-8">
        {/* Filters */}
        <aside className="space-y-6">
          <form className="space-y-2" action="/products">
            <label className="text-sm font-medium">Cari</label>
            <Input name="search" placeholder="Cari produk..." defaultValue={parsed.search ?? ""} />
            <Button type="submit" size="sm" className="w-full">Cari</Button>
          </form>

          <div>
            <div className="text-sm font-medium mb-2">Kategori</div>
            <ul className="space-y-1 text-sm">
              <li>
                <Link href={buildHref({ category: undefined, cursor: undefined })} className={!parsed.category ? "text-[var(--primary)] font-medium" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}>
                  Semua Kategori
                </Link>
              </li>
              {cats.map((c) => (
                <li key={c.id}>
                  <Link
                    href={buildHref({ category: c.slug, cursor: undefined })}
                    className={parsed.category === c.slug ? "text-[var(--primary)] font-medium" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <form className="space-y-2" action="/products">
            {parsed.category && <input type="hidden" name="category" value={parsed.category} />}
            <div className="text-sm font-medium">Rentang Harga</div>
            <div className="flex gap-2">
              <Input name="minPrice" type="number" placeholder="Min" defaultValue={parsed.minPrice ?? ""} />
              <Input name="maxPrice" type="number" placeholder="Max" defaultValue={parsed.maxPrice ?? ""} />
            </div>
            <Button type="submit" variant="outline" size="sm" className="w-full">Terapkan</Button>
          </form>
        </aside>

        {/* Grid */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-sm text-[var(--muted-foreground)] mr-auto">{items.length} produk</span>
            {sorts.map(([val, label]) => (
              <Link
                key={val}
                href={buildHref({ sort: val, cursor: undefined })}
                className={`rounded-md px-3 py-1.5 text-xs border ${parsed.sort === val ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]" : "border-[var(--border)] hover:bg-[var(--accent)]"}`}
              >
                {label}
              </Link>
            ))}
          </div>

          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--border)] p-12 text-center text-[var(--muted-foreground)]">
              Tidak ada produk yang cocok dengan filter.
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          )}

          {hasMore && nextCursor && (
            <div className="mt-8 text-center">
              <Button asChild variant="outline">
                <Link href={buildHref({ cursor: nextCursor })}>Muat lebih banyak</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
