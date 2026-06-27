import Link from "next/link";
import { Star } from "lucide-react";
import { formatIDR } from "@/lib/utils";
import type { ProductListItem } from "@/server/services/catalog";

export function ProductCard({ p }: { p: ProductListItem }) {
  return (
    <Link
      href={`/products/${p.slug}`}
      className="group rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden transition-shadow hover:shadow-md"
    >
      <div className="aspect-square overflow-hidden bg-[var(--muted)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.image ?? "https://picsum.photos/seed/placeholder/700/700"}
          alt={p.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <div className="p-3">
        {p.brand && <div className="text-xs text-[var(--muted-foreground)]">{p.brand}</div>}
        <div className="line-clamp-2 text-sm font-medium min-h-10">{p.name}</div>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-bold text-[var(--primary)]">{formatIDR(p.basePrice)}</span>
          <span className="flex items-center gap-0.5 text-xs text-[var(--muted-foreground)]">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            {(p.ratingAvg / 10).toFixed(1)}
          </span>
        </div>
      </div>
    </Link>
  );
}
