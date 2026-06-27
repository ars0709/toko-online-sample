import { and, eq, gte, lte } from "drizzle-orm";
import { Tag, Zap, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { coupons, promotions, flashSales } from "@/lib/db/schema";
import { formatIDR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Promo & Kupon" };

export default async function PromoPage() {
  const now = new Date();
  const [publicCoupons, autoPromos, activeFlash] = await Promise.all([
    db.select().from(coupons).where(and(eq(coupons.isActive, true), eq(coupons.channel, "PUBLIC"))),
    db.select().from(promotions).where(eq(promotions.isActive, true)),
    db.select().from(flashSales).where(and(lte(flashSales.startsAt, now), gte(flashSales.endsAt, now))),
  ]);

  return (
    <div className="container-page py-8 space-y-10">
      <h1 className="text-2xl font-bold">Promo & Kupon</h1>

      <section>
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-3"><Tag className="size-5 text-[var(--primary)]" /> Kupon Publik</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {publicCoupons.map((c) => (
            <div key={c.id} className="rounded-lg border border-dashed border-[var(--primary)] p-4 bg-[var(--primary)]/5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-[var(--primary)]">{c.code}</span>
                <Badge>{c.type === "PERCENT" ? `${c.value}%` : formatIDR(c.value)}</Badge>
              </div>
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                {c.minSubtotal > 0 ? `Min. belanja ${formatIDR(c.minSubtotal)}. ` : ""}
                {c.firstOrderOnly ? "Khusus order pertama. " : ""}
                {c.maxDiscount ? `Maks. diskon ${formatIDR(c.maxDiscount)}.` : ""}
              </p>
            </div>
          ))}
          {publicCoupons.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">Belum ada kupon publik.</p>}
        </div>
      </section>

      <section>
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-3"><Truck className="size-5 text-emerald-500" /> Promo Otomatis</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {autoPromos.map((p) => (
            <div key={p.id} className="rounded-lg border border-[var(--border)] p-4">
              <div className="font-medium">{p.name}</div>
              <Badge variant="secondary" className="mt-1">{p.type.replace(/_/g, " ")}</Badge>
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">Diterapkan otomatis di keranjang tanpa kode.</p>
            </div>
          ))}
        </div>
      </section>

      {activeFlash.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-3"><Zap className="size-5 text-amber-500" /> Flash Sale Berlangsung</h2>
          {activeFlash.map((f) => (
            <div key={f.id} className="rounded-lg border border-amber-300/50 bg-amber-50/40 dark:bg-amber-950/20 p-4">
              <div className="font-medium">{f.name}</div>
              <div className="text-xs text-[var(--muted-foreground)]">Berakhir {new Date(f.endsAt).toLocaleString("id-ID")}</div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
