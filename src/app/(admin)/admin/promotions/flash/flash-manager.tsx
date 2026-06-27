"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIDR } from "@/lib/utils";
import {
  addFlashSaleItem,
  createFlashSale,
  removeFlashSaleItem,
  updateFlashSale,
} from "@/server/actions/admin-content";

export type FlashItem = {
  id: string;
  variantId: string;
  salePrice: number;
  stockLimit: number;
  soldCount: number;
  label: string;
};

export type FlashSaleRow = {
  id: string;
  name: string;
  bannerImage: string | null;
  status: string;
  startsAt: string;
  endsAt: string;
  items: FlashItem[];
};

export type VariantOption = {
  id: string;
  label: string;
  price: number;
};

const STATUSES = ["SCHEDULED", "ACTIVE", "ENDED"];

const selectCls =
  "flex h-10 w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

type FormShape = {
  name: string;
  bannerImage: string;
  status: string;
  startsAt: string;
  endsAt: string;
};

const empty: FormShape = {
  name: "",
  bannerImage: "",
  status: "SCHEDULED",
  startsAt: "",
  endsAt: "",
};

export function FlashManager({
  sales,
  variants,
}: {
  sales: FlashSaleRow[];
  variants: VariantOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormShape>(empty);

  // per-sale "add item" inline state
  const [itemSaleId, setItemSaleId] = useState<string | null>(null);
  const [itemVariantId, setItemVariantId] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemStock, setItemStock] = useState("0");

  function openNew() {
    setEditingId(null);
    setForm(empty);
    setError(null);
    setOpen(true);
  }

  function openEdit(s: FlashSaleRow) {
    setEditingId(s.id);
    setForm({
      name: s.name,
      bannerImage: s.bannerImage ?? "",
      status: s.status,
      startsAt: toLocalInput(s.startsAt),
      endsAt: toLocalInput(s.endsAt),
    });
    setError(null);
    setOpen(true);
  }

  function save() {
    setError(null);
    const payload = {
      name: form.name,
      bannerImage: form.bannerImage || null,
      status: form.status,
      startsAt: form.startsAt,
      endsAt: form.endsAt,
    };
    startTransition(async () => {
      const res = editingId
        ? await updateFlashSale({ ...payload, id: editingId })
        : await createFlashSale(payload);
      if (!res.ok) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  }

  function startAddItem(saleId: string) {
    setItemSaleId(saleId);
    setItemVariantId("");
    setItemPrice("");
    setItemStock("0");
    setError(null);
  }

  function addItem() {
    if (!itemSaleId) return;
    setError(null);
    startTransition(async () => {
      const res = await addFlashSaleItem({
        flashSaleId: itemSaleId,
        variantId: itemVariantId,
        salePrice: Number(itemPrice) || 0,
        stockLimit: Number(itemStock) || 0,
      });
      if (!res.ok) return setError(res.error);
      setItemSaleId(null);
      router.refresh();
    });
  }

  function removeItem(id: string) {
    if (!confirm("Hapus item ini?")) return;
    startTransition(async () => {
      const res = await removeFlashSaleItem(id);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  const set = <K extends keyof FormShape>(k: K, v: FormShape[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Flash Sale</h1>
        <Button onClick={openNew}>
          <Plus className="size-4" /> Tambah Flash Sale
        </Button>
      </div>

      {open && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{editingId ? "Edit Flash Sale" : "Flash Sale Baru"}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Nama</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div>
                <Label>Status</Label>
                <select
                  className={selectCls}
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label>Banner Image URL</Label>
                <Input
                  value={form.bannerImage}
                  onChange={(e) => set("bannerImage", e.target.value)}
                  placeholder="opsional"
                />
              </div>
              <div>
                <Label>Mulai</Label>
                <Input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => set("startsAt", e.target.value)}
                />
              </div>
              <div>
                <Label>Selesai</Label>
                <Input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => set("endsAt", e.target.value)}
                />
              </div>
            </div>
            {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={save} disabled={pending}>
                {pending ? "Menyimpan..." : "Simpan"}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!open && error && <p className="text-sm text-[var(--destructive)]">{error}</p>}

      <div className="space-y-4">
        {sales.map((s) => (
          <Card key={s.id}>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {s.name}
                  <Badge variant={s.status === "ACTIVE" ? "success" : "secondary"}>{s.status}</Badge>
                </CardTitle>
                <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {new Date(s.startsAt).toLocaleString("id-ID")} —{" "}
                  {new Date(s.endsAt).toLocaleString("id-ID")}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                <Pencil className="size-3.5" /> Edit
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border border-[var(--border)] overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[var(--muted-foreground)] border-b border-[var(--border)] bg-[var(--muted)]/40">
                      <th className="py-2 px-3 font-medium">Produk / Varian</th>
                      <th className="py-2 px-3 font-medium">Harga Sale</th>
                      <th className="py-2 px-3 font-medium">Stok</th>
                      <th className="py-2 px-3 font-medium">Terjual</th>
                      <th className="py-2 px-3 font-medium text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.items.map((it) => (
                      <tr key={it.id} className="border-b border-[var(--border)] last:border-0">
                        <td className="py-2 px-3">{it.label}</td>
                        <td className="py-2 px-3">{formatIDR(it.salePrice)}</td>
                        <td className="py-2 px-3 text-[var(--muted-foreground)]">
                          {it.stockLimit || "—"}
                        </td>
                        <td className="py-2 px-3 text-[var(--muted-foreground)]">{it.soldCount}</td>
                        <td className="py-2 px-3">
                          <div className="flex justify-end">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeItem(it.id)}
                              disabled={pending}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {s.items.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-[var(--muted-foreground)]">
                          Belum ada item.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {itemSaleId === s.id ? (
                <div className="grid gap-3 sm:grid-cols-[1fr_140px_120px_auto] sm:items-end rounded-md border border-[var(--border)] bg-[var(--muted)]/30 p-3">
                  <div>
                    <Label>Varian</Label>
                    <select
                      className={selectCls}
                      value={itemVariantId}
                      onChange={(e) => {
                        setItemVariantId(e.target.value);
                        const v = variants.find((x) => x.id === e.target.value);
                        if (v && !itemPrice) setItemPrice(String(v.price));
                      }}
                    >
                      <option value="">Pilih varian…</option>
                      {variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Harga Sale (Rp)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Batas Stok</Label>
                    <Input
                      type="number"
                      min={0}
                      value={itemStock}
                      onChange={(e) => setItemStock(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={addItem} disabled={pending}>
                      Tambah
                    </Button>
                    <Button variant="outline" onClick={() => setItemSaleId(null)}>
                      Batal
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => startAddItem(s.id)}>
                  <Plus className="size-3.5" /> Tambah Item
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {sales.length === 0 && (
          <p className="py-8 text-center text-[var(--muted-foreground)]">Belum ada flash sale.</p>
        )}
      </div>
    </div>
  );
}
