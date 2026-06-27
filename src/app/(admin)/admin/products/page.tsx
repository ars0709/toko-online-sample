import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search, Package } from "lucide-react";
import { count, desc, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { productImages, productVariants, products } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { formatIDR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";
export const metadata = { title: "Produk" };

const statusVariant: Record<string, "success" | "warning" | "secondary"> = {
  ACTIVE: "success",
  DRAFT: "warning",
  ARCHIVED: "secondary",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) redirect("/login?next=/admin");

  const q = (await searchParams).q?.trim() ?? "";

  const rows = await db
    .select()
    .from(products)
    .where(q ? sql`${products.name} ilike ${"%" + q + "%"}` : undefined)
    .orderBy(desc(products.createdAt))
    .limit(50);

  const ids = rows.map((r) => r.id);
  const [vcounts, imgs] = await Promise.all([
    ids.length
      ? db
          .select({ productId: productVariants.productId, c: count() })
          .from(productVariants)
          .where(inArray(productVariants.productId, ids))
          .groupBy(productVariants.productId)
      : Promise.resolve([] as { productId: string; c: number }[]),
    ids.length
      ? db
          .select({
            productId: productImages.productId,
            url: productImages.url,
            sortOrder: productImages.sortOrder,
          })
          .from(productImages)
          .where(inArray(productImages.productId, ids))
      : Promise.resolve([] as { productId: string; url: string; sortOrder: number }[]),
  ]);

  const vcountMap = new Map(vcounts.map((v) => [v.productId, v.c]));
  const imgMap = new Map<string, string>();
  for (const img of imgs) {
    const existing = imgMap.get(img.productId);
    if (existing === undefined) imgMap.set(img.productId, img.url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Produk</h1>
          <p className="text-sm text-[var(--muted-foreground)]">{rows.length} produk ditampilkan</p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="size-4" /> Tambah Produk
          </Link>
        </Button>
      </div>

      <form className="relative max-w-sm">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <Input name="q" defaultValue={q} placeholder="Cari nama produk..." className="pl-9" />
      </form>

      <div className="rounded-lg border border-[var(--border)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--muted-foreground)] border-b border-[var(--border)] bg-[var(--muted)]/40">
              <th className="py-3 px-4 font-medium">Produk</th>
              <th className="py-3 px-4 font-medium">Brand</th>
              <th className="py-3 px-4 font-medium">Harga</th>
              <th className="py-3 px-4 font-medium">Varian</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const img = imgMap.get(p.id);
              return (
                <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--muted)]">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img} alt={p.name} className="size-full object-cover" />
                        ) : (
                          <Package className="size-4 text-[var(--muted-foreground)]" />
                        )}
                      </span>
                      <span className="font-medium truncate">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[var(--muted-foreground)]">{p.brand ?? "—"}</td>
                  <td className="py-3 px-4">{formatIDR(p.basePrice)}</td>
                  <td className="py-3 px-4">{vcountMap.get(p.id) ?? 0}</td>
                  <td className="py-3 px-4">
                    <Badge variant={statusVariant[p.status] ?? "secondary"}>{p.status}</Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/products/${p.id}/edit`}>Edit</Link>
                    </Button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[var(--muted-foreground)]">
                  Tidak ada produk.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
