"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createBanner, deleteBanner, updateBanner } from "@/server/actions/admin-content";

type Placement = "HOME_HERO" | "HOME_STRIP" | "CATEGORY_TOP" | "CHECKOUT";

export type BannerRow = {
  id: string;
  title: string;
  imageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  placement: Placement;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
};

const PLACEMENTS: Placement[] = ["HOME_HERO", "HOME_STRIP", "CATEGORY_TOP", "CHECKOUT"];

const selectCls =
  "flex h-10 w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

type FormShape = {
  title: string;
  imageUrl: string;
  mobileImageUrl: string;
  linkUrl: string;
  placement: Placement;
  sortOrder: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

const empty: FormShape = {
  title: "",
  imageUrl: "",
  mobileImageUrl: "",
  linkUrl: "",
  placement: "HOME_HERO",
  sortOrder: "0",
  startsAt: "",
  endsAt: "",
  isActive: true,
};

function toForm(b: BannerRow): FormShape {
  return {
    title: b.title,
    imageUrl: b.imageUrl,
    mobileImageUrl: b.mobileImageUrl ?? "",
    linkUrl: b.linkUrl ?? "",
    placement: b.placement,
    sortOrder: String(b.sortOrder),
    startsAt: toLocalInput(b.startsAt),
    endsAt: toLocalInput(b.endsAt),
    isActive: b.isActive,
  };
}

export function BannerManager({ banners }: { banners: BannerRow[] }) {
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

  function openEdit(b: BannerRow) {
    setEditingId(b.id);
    setForm(toForm(b));
    setError(null);
    setOpen(true);
  }

  function save() {
    setError(null);
    const payload = {
      title: form.title,
      imageUrl: form.imageUrl,
      mobileImageUrl: form.mobileImageUrl || null,
      linkUrl: form.linkUrl || null,
      placement: form.placement,
      sortOrder: Number(form.sortOrder) || 0,
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
      isActive: form.isActive,
    };
    startTransition(async () => {
      const res = editingId
        ? await updateBanner({ ...payload, id: editingId })
        : await createBanner(payload);
      if (!res.ok) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Hapus banner ini?")) return;
    startTransition(async () => {
      const res = await deleteBanner(id);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  const set = <K extends keyof FormShape>(k: K, v: FormShape[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Banner</h1>
        <Button onClick={openNew}>
          <Plus className="size-4" /> Tambah Banner
        </Button>
      </div>

      {open && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{editingId ? "Edit Banner" : "Banner Baru"}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Judul</Label>
                <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
              </div>
              <div>
                <Label>Penempatan</Label>
                <select
                  className={selectCls}
                  value={form.placement}
                  onChange={(e) => set("placement", e.target.value as Placement)}
                >
                  {PLACEMENTS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>URL Gambar</Label>
                <Input
                  value={form.imageUrl}
                  onChange={(e) => set("imageUrl", e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>URL Gambar Mobile</Label>
                <Input
                  value={form.mobileImageUrl}
                  onChange={(e) => set("mobileImageUrl", e.target.value)}
                  placeholder="opsional"
                />
              </div>
              <div>
                <Label>Link Tujuan</Label>
                <Input
                  value={form.linkUrl}
                  onChange={(e) => set("linkUrl", e.target.value)}
                  placeholder="opsional, mis. /c/promo"
                />
              </div>
              <div>
                <Label>Urutan</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => set("sortOrder", e.target.value)}
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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set("isActive", e.target.checked)}
              />
              Aktif
            </label>
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
              <th className="py-3 px-4 font-medium">Judul</th>
              <th className="py-3 px-4 font-medium">Penempatan</th>
              <th className="py-3 px-4 font-medium">Urutan</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {banners.map((b) => (
              <tr key={b.id} className="border-b border-[var(--border)] last:border-0">
                <td className="py-3 px-4 font-medium">{b.title}</td>
                <td className="py-3 px-4 text-[var(--muted-foreground)]">{b.placement}</td>
                <td className="py-3 px-4 text-[var(--muted-foreground)]">{b.sortOrder}</td>
                <td className="py-3 px-4">
                  <Badge variant={b.isActive ? "success" : "secondary"}>
                    {b.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(b)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => remove(b.id)}
                      disabled={pending}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {banners.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--muted-foreground)]">
                  Belum ada banner.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
