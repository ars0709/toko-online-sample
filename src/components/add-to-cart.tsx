"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addToCartAction } from "@/server/actions/cart";

type Variant = { id: string; name: string; price: number; available: number };

export function AddToCart({ variants }: { variants: Variant[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState(variants[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const variant = variants.find((v) => v.id === selected);
  const max = variant?.available ?? 0;
  const outOfStock = max <= 0;

  function add() {
    if (!variant) return;
    setMsg(null);
    startTransition(async () => {
      const res = await addToCartAction(variant.id, qty);
      if (res.ok) {
        setMsg({ type: "ok", text: "Ditambahkan ke keranjang" });
        router.refresh();
      } else {
        setMsg({ type: "err", text: res.error });
      }
    });
  }

  return (
    <div className="space-y-4">
      {variants.length > 1 && (
        <div>
          <div className="text-sm font-medium mb-2">Pilih Varian</div>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setSelected(v.id);
                  setQty(1);
                }}
                disabled={v.available <= 0}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors disabled:opacity-40 ${
                  selected === v.id
                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "border-[var(--border)] hover:bg-[var(--accent)]"
                }`}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="text-sm">
        {outOfStock ? (
          <span className="text-[var(--destructive)] font-medium">Stok habis</span>
        ) : (
          <span className="text-[var(--muted-foreground)]">Stok tersedia: {max}</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-md border border-[var(--border)]">
          <Button variant="ghost" size="icon" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={outOfStock}>
            <Minus />
          </Button>
          <span className="w-10 text-center text-sm">{qty}</span>
          <Button variant="ghost" size="icon" onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={outOfStock}>
            <Plus />
          </Button>
        </div>
        <Button onClick={add} disabled={pending || outOfStock} size="lg" className="flex-1">
          {msg?.type === "ok" ? <Check /> : <ShoppingCart />}
          {pending ? "Menambahkan..." : "Tambah ke Keranjang"}
        </Button>
      </div>

      {msg && (
        <p className={`text-sm ${msg.type === "ok" ? "text-emerald-600" : "text-[var(--destructive)]"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
