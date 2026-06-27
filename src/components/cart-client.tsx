"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Minus, Plus, Trash2, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatIDR } from "@/lib/utils";
import {
  applyCouponAction,
  removeCartItemAction,
  removeCouponAction,
  updateCartItemAction,
} from "@/server/actions/cart";
import type { CartView } from "@/server/services/cart";

export function CartClient({ cart, checkout = false }: { cart: CartView; checkout?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setErr(null);
      const res = await fn();
      if (!res.ok) setErr(res.error ?? "Gagal");
      router.refresh();
    });

  const t = cart.totals;

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-8">
      <div className="space-y-3">
        {cart.items.map((it) => (
          <div key={it.id} className="flex gap-4 rounded-lg border border-[var(--border)] p-3">
            <Link href={`/products/${it.productSlug}`} className="size-20 shrink-0 overflow-hidden rounded-md bg-[var(--muted)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.image ?? ""} alt={it.productName} className="h-full w-full object-cover" />
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/products/${it.productSlug}`} className="font-medium text-sm hover:underline line-clamp-1">
                {it.productName}
              </Link>
              <div className="text-xs text-[var(--muted-foreground)]">{it.variantName} · {it.sku}</div>
              <div className="text-sm font-bold text-[var(--primary)] mt-1">{formatIDR(it.unitPrice)}</div>
              {!checkout && (
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center rounded-md border border-[var(--border)]">
                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={pending} onClick={() => run(() => updateCartItemAction(it.id, it.quantity - 1))}>
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-8 text-center text-sm">{it.quantity}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={pending || it.quantity >= it.available} onClick={() => run(() => updateCartItemAction(it.id, it.quantity + 1))}>
                      <Plus className="size-3" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-[var(--destructive)]" disabled={pending} onClick={() => run(() => removeCartItemAction(it.id))}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )}
              {checkout && <div className="text-xs text-[var(--muted-foreground)] mt-1">Qty: {it.quantity}</div>}
            </div>
            <div className="text-right text-sm font-semibold">{formatIDR(it.lineTotal)}</div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {!checkout && (
          <div className="rounded-lg border border-[var(--border)] p-4">
            <div className="text-sm font-medium mb-2 flex items-center gap-2"><Tag className="size-4" /> Kupon</div>
            {cart.couponCode ? (
              <div className="flex items-center justify-between rounded-md bg-[var(--muted)] px-3 py-2 text-sm">
                <span className="font-medium">{cart.couponCode}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" disabled={pending} onClick={() => run(() => removeCouponAction())}>
                  <X className="size-3" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input placeholder="Kode kupon" value={code} onChange={(e) => setCode(e.target.value)} />
                <Button disabled={pending || !code} onClick={() => run(() => applyCouponAction(code))}>Pakai</Button>
              </div>
            )}
          </div>
        )}

        <div className="rounded-lg border border-[var(--border)] p-4 space-y-2 text-sm">
          <Row label="Subtotal" value={formatIDR(t.subtotal)} />
          {t.discountTotal > 0 && <Row label="Diskon" value={`- ${formatIDR(t.discountTotal)}`} className="text-emerald-600" />}
          <Row label="Ongkir" value={t.freeShipping ? "GRATIS" : formatIDR(t.shippingTotal)} />
          <Row label="PPN (11%)" value={formatIDR(t.taxTotal)} />
          {t.appliedPromotions.length > 0 && (
            <div className="text-xs text-emerald-600">Promo: {t.appliedPromotions.join(", ")}</div>
          )}
          <div className="border-t border-[var(--border)] pt-2 flex justify-between font-bold text-base">
            <span>Total</span>
            <span className="text-[var(--primary)]">{formatIDR(t.grandTotal)}</span>
          </div>
        </div>

        {err && <p className="text-sm text-[var(--destructive)]">{err}</p>}

        {!checkout && (
          <Button asChild size="lg" className="w-full" disabled={cart.items.length === 0}>
            <Link href="/checkout">Lanjut ke Checkout</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex justify-between ${className}`}>
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span>{value}</span>
    </div>
  );
}
