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
import { createCoupon, deleteCoupon, updateCoupon } from "@/server/actions/admin";

export type CouponRow = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minSubtotal: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  perUserLimit: number | null;
  firstOrderOnly: boolean;
  channel: string;
  isActive: boolean;
};

const selectCls =
  "flex h-10 w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

type FormShape = {
  code: string;
  type: "PERCENT" | "FIXED";
  value: string;
  minSubtotal: string;
  maxDiscount: string;
  usageLimit: string;
  perUserLimit: string;
  firstOrderOnly: boolean;
  channel: "PUBLIC" | "PRIVATE";
  isActive: boolean;
};

const empty: FormShape = {
  code: "",
  type: "PERCENT",
  value: "",
  minSubtotal: "",
  maxDiscount: "",
  usageLimit: "",
  perUserLimit: "",
  firstOrderOnly: false,
  channel: "PUBLIC",
  isActive: true,
};

function toForm(c: CouponRow): FormShape {
  return {
    code: c.code,
    type: c.type,
    value: String(c.value),
    minSubtotal: String(c.minSubtotal ?? 0),
    maxDiscount: c.maxDiscount != null ? String(c.maxDiscount) : "",
    usageLimit: c.usageLimit != null ? String(c.usageLimit) : "",
    perUserLimit: c.perUserLimit != null ? String(c.perUserLimit) : "",
    firstOrderOnly: c.firstOrderOnly,
    channel: c.channel === "PRIVATE" ? "PRIVATE" : "PUBLIC",
    isActive: c.isActive,
  };
}

function num(s: string): number | null {
  if (s.trim() === "") return null;
  return Number(s);
}

export function CouponManager({ coupons }: { coupons: CouponRow[] }) {
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

  function openEdit(c: CouponRow) {
    setEditingId(c.id);
    setForm(toForm(c));
    setError(null);
    setOpen(true);
  }

  function save() {
    setError(null);
    const payload = {
      code: form.code,
      type: form.type,
      value: Number(form.value),
      minSubtotal: num(form.minSubtotal) ?? 0,
      maxDiscount: num(form.maxDiscount),
      usageLimit: num(form.usageLimit),
      perUserLimit: num(form.perUserLimit),
      firstOrderOnly: form.firstOrderOnly,
      channel: form.channel,
      isActive: form.isActive,
    };
    startTransition(async () => {
      const res = editingId
        ? await updateCoupon({ ...payload, id: editingId })
        : await createCoupon(payload);
      if (!res.ok) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Hapus kupon ini?")) return;
    startTransition(async () => {
      const res = await deleteCoupon(id);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  const set = <K extends keyof FormShape>(k: K, v: FormShape[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Kupon</h1>
        <Button onClick={openNew}>
          <Plus className="size-4" /> Tambah Kupon
        </Button>
      </div>

      {open && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{editingId ? "Edit Kupon" : "Kupon Baru"}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Kode</Label>
                <Input
                  value={form.code}
                  onChange={(e) => set("code", e.target.value.toUpperCase())}
                  placeholder="HEMAT10"
                />
              </div>
              <div>
                <Label>Tipe</Label>
                <select
                  className={selectCls}
                  value={form.type}
                  onChange={(e) => set("type", e.target.value as "PERCENT" | "FIXED")}
                >
                  <option value="PERCENT">PERCENT</option>
                  <option value="FIXED">FIXED</option>
                </select>
              </div>
              <div>
                <Label>Nilai {form.type === "PERCENT" ? "(%)" : "(Rp)"}</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.value}
                  onChange={(e) => set("value", e.target.value)}
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
              <div>
                <Label>Maks. Diskon (Rp)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.maxDiscount}
                  onChange={(e) => set("maxDiscount", e.target.value)}
                  placeholder="opsional"
                />
              </div>
              <div>
                <Label>Channel</Label>
                <select
                  className={selectCls}
                  value={form.channel}
                  onChange={(e) => set("channel", e.target.value as "PUBLIC" | "PRIVATE")}
                >
                  <option value="PUBLIC">PUBLIC</option>
                  <option value="PRIVATE">PRIVATE</option>
                </select>
              </div>
              <div>
                <Label>Batas Pemakaian</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.usageLimit}
                  onChange={(e) => set("usageLimit", e.target.value)}
                  placeholder="opsional"
                />
              </div>
              <div>
                <Label>Batas / Pengguna</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.perUserLimit}
                  onChange={(e) => set("perUserLimit", e.target.value)}
                  placeholder="opsional"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.firstOrderOnly}
                  onChange={(e) => set("firstOrderOnly", e.target.checked)}
                />
                Hanya order pertama
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
              <th className="py-3 px-4 font-medium">Kode</th>
              <th className="py-3 px-4 font-medium">Tipe</th>
              <th className="py-3 px-4 font-medium">Nilai</th>
              <th className="py-3 px-4 font-medium">Min.</th>
              <th className="py-3 px-4 font-medium">Pemakaian</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-b border-[var(--border)] last:border-0">
                <td className="py-3 px-4 font-mono font-medium">{c.code}</td>
                <td className="py-3 px-4">{c.type}</td>
                <td className="py-3 px-4">
                  {c.type === "PERCENT" ? `${c.value}%` : formatIDR(c.value)}
                </td>
                <td className="py-3 px-4 text-[var(--muted-foreground)]">
                  {c.minSubtotal ? formatIDR(c.minSubtotal) : "—"}
                </td>
                <td className="py-3 px-4 text-[var(--muted-foreground)]">
                  {c.usedCount}
                  {c.usageLimit != null ? ` / ${c.usageLimit}` : ""}
                </td>
                <td className="py-3 px-4">
                  <Badge variant={c.isActive ? "success" : "secondary"}>
                    {c.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => remove(c.id)}
                      disabled={pending}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--muted-foreground)]">
                  Belum ada kupon.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
