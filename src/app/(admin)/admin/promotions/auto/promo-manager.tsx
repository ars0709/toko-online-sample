"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIDR } from "@/lib/utils";
import {
  createPromotion,
  deletePromotion,
  updatePromotion,
} from "@/server/actions/admin-content";

type PromoType = "CART_PERCENT" | "CART_FIXED" | "BUY_X_GET_Y" | "FREE_SHIPPING" | "BUNDLE";

export type PromoRow = {
  id: string;
  name: string;
  type: PromoType;
  config: Record<string, unknown>;
  priority: number;
  stackable: boolean;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
};

const PROMO_TYPES: PromoType[] = [
  "CART_PERCENT",
  "CART_FIXED",
  "BUY_X_GET_Y",
  "FREE_SHIPPING",
  "BUNDLE",
];

const selectCls =
  "flex h-10 w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

function num(v: unknown): string {
  const n = Number(v);
  return Number.isFinite(n) && n !== 0 ? String(n) : v == null ? "" : String(v ?? "");
}

type FormShape = {
  name: string;
  type: PromoType;
  priority: string;
  stackable: boolean;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  // config fields (union of all types)
  threshold: string;
  percent: string;
  amount: string;
  minSubtotal: string;
  buyQty: string;
  getQty: string;
  note: string;
};

const empty: FormShape = {
  name: "",
  type: "CART_PERCENT",
  priority: "0",
  stackable: false,
  startsAt: "",
  endsAt: "",
  isActive: true,
  threshold: "",
  percent: "",
  amount: "",
  minSubtotal: "",
  buyQty: "",
  getQty: "",
  note: "",
};

function toForm(p: PromoRow): FormShape {
  const c = p.config ?? {};
  return {
    name: p.name,
    type: p.type,
    priority: String(p.priority),
    stackable: p.stackable,
    startsAt: toLocalInput(p.startsAt),
    endsAt: toLocalInput(p.endsAt),
    isActive: p.isActive,
    threshold: num(c.threshold),
    percent: num(c.percent),
    amount: num(c.amount),
    minSubtotal: num(c.minSubtotal),
    buyQty: num(c.buyQty),
    getQty: num(c.getQty),
    note: typeof c.note === "string" ? c.note : "",
  };
}

function buildConfig(form: FormShape): Record<string, unknown> {
  switch (form.type) {
    case "FREE_SHIPPING":
      return { threshold: Number(form.threshold) || 0 };
    case "CART_PERCENT":
      return { percent: Number(form.percent) || 0, minSubtotal: Number(form.minSubtotal) || 0 };
    case "CART_FIXED":
      return { amount: Number(form.amount) || 0, minSubtotal: Number(form.minSubtotal) || 0 };
    case "BUY_X_GET_Y":
      return { buyQty: Number(form.buyQty) || 0, getQty: Number(form.getQty) || 0 };
    case "BUNDLE":
      return { note: form.note };
    default:
      return {};
  }
}

function describe(p: PromoRow): string {
  const c = p.config ?? {};
  switch (p.type) {
    case "FREE_SHIPPING":
      return `Min. ${formatIDR(Number(c.threshold) || 0)}`;
    case "CART_PERCENT":
      return `${Number(c.percent) || 0}% (min ${formatIDR(Number(c.minSubtotal) || 0)})`;
    case "CART_FIXED":
      return `${formatIDR(Number(c.amount) || 0)} (min ${formatIDR(Number(c.minSubtotal) || 0)})`;
    case "BUY_X_GET_Y":
      return `Beli ${Number(c.buyQty) || 0} gratis ${Number(c.getQty) || 0}`;
    case "BUNDLE":
      return typeof c.note === "string" ? c.note : "—";
    default:
      return "—";
  }
}

export function PromoManager({ promotions }: { promotions: PromoRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormShape>(empty);

  function openNew() {
    setEditingId(null);
    setForm(empty);
    setError(null);
    setOpen(true);
  }

  function openEdit(p: PromoRow) {
    setEditingId(p.id);
    setForm(toForm(p));
    setError(null);
    setOpen(true);
  }

  function save() {
    setError(null);
    const payload = {
      name: form.name,
      type: form.type,
      config: buildConfig(form),
      priority: Number(form.priority) || 0,
      stackable: form.stackable,
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
      isActive: form.isActive,
    };
    startTransition(async () => {
      const res = editingId
        ? await updatePromotion({ ...payload, id: editingId })
        : await createPromotion(payload);
      if (!res.ok) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Hapus promo ini?")) return;
    startTransition(async () => {
      const res = await deletePromotion(id);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  const set = <K extends keyof FormShape>(k: K, v: FormShape[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Promo Otomatis</h1>
        <Button onClick={openNew}>
          <Plus className="size-4" /> Tambah Promo
        </Button>
      </div>

      {open && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{editingId ? "Edit Promo" : "Promo Baru"}</CardTitle>
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
                <Label>Tipe</Label>
                <select
                  className={selectCls}
                  value={form.type}
                  onChange={(e) => set("type", e.target.value as PromoType)}
                >
                  {PROMO_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* type-specific config */}
            <div className="grid gap-4 sm:grid-cols-2 rounded-md border border-[var(--border)] bg-[var(--muted)]/30 p-4">
              {form.type === "FREE_SHIPPING" && (
                <div>
                  <Label>Min. Subtotal Gratis Ongkir (Rp)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.threshold}
                    onChange={(e) => set("threshold", e.target.value)}
                  />
                </div>
              )}
              {form.type === "CART_PERCENT" && (
                <>
                  <div>
                    <Label>Persentase (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.percent}
                      onChange={(e) => set("percent", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Min. Subtotal (Rp)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.minSubtotal}
                      onChange={(e) => set("minSubtotal", e.target.value)}
                    />
                  </div>
                </>
              )}
              {form.type === "CART_FIXED" && (
                <>
                  <div>
                    <Label>Potongan (Rp)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.amount}
                      onChange={(e) => set("amount", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Min. Subtotal (Rp)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.minSubtotal}
                      onChange={(e) => set("minSubtotal", e.target.value)}
                    />
                  </div>
                </>
              )}
              {form.type === "BUY_X_GET_Y" && (
                <>
                  <div>
                    <Label>Beli (qty)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.buyQty}
                      onChange={(e) => set("buyQty", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Gratis (qty)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.getQty}
                      onChange={(e) => set("getQty", e.target.value)}
                    />
                  </div>
                </>
              )}
              {form.type === "BUNDLE" && (
                <div className="sm:col-span-2">
                  <Label>Catatan Bundle</Label>
                  <Textarea value={form.note} onChange={(e) => set("note", e.target.value)} />
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Prioritas</Label>
                <Input
                  type="number"
                  value={form.priority}
                  onChange={(e) => set("priority", e.target.value)}
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
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.stackable}
                  onChange={(e) => set("stackable", e.target.checked)}
                />
                Bisa digabung (stackable)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => set("isActive", e.target.checked)}
                />
                Aktif
              </label>
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

      <div className="rounded-lg border border-[var(--border)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--muted-foreground)] border-b border-[var(--border)] bg-[var(--muted)]/40">
              <th className="py-3 px-4 font-medium">Nama</th>
              <th className="py-3 px-4 font-medium">Tipe</th>
              <th className="py-3 px-4 font-medium">Detail</th>
              <th className="py-3 px-4 font-medium">Prioritas</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((p) => (
              <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                <td className="py-3 px-4 font-medium">{p.name}</td>
                <td className="py-3 px-4 text-[var(--muted-foreground)]">{p.type}</td>
                <td className="py-3 px-4 text-[var(--muted-foreground)]">{describe(p)}</td>
                <td className="py-3 px-4 text-[var(--muted-foreground)]">{p.priority}</td>
                <td className="py-3 px-4">
                  <Badge variant={p.isActive ? "success" : "secondary"}>
                    {p.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => remove(p.id)}
                      disabled={pending}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {promotions.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[var(--muted-foreground)]">
                  Belum ada promo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
