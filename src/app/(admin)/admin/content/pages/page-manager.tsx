"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteCmsPage, upsertCmsPage } from "@/server/actions/admin-content";

type Status = "DRAFT" | "PUBLISHED";

export type CmsPageRow = {
  id: string;
  slug: string;
  title: string;
  content: string;
  status: Status;
  seoTitle: string | null;
  seoDescription: string | null;
};

const selectCls =
  "flex h-10 w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

type FormShape = {
  slug: string;
  title: string;
  content: string;
  status: Status;
  seoTitle: string;
  seoDescription: string;
};

const empty: FormShape = {
  slug: "",
  title: "",
  content: "",
  status: "DRAFT",
  seoTitle: "",
  seoDescription: "",
};

function toForm(p: CmsPageRow): FormShape {
  return {
    slug: p.slug,
    title: p.title,
    content: p.content,
    status: p.status,
    seoTitle: p.seoTitle ?? "",
    seoDescription: p.seoDescription ?? "",
  };
}

export function PageManager({ pages }: { pages: CmsPageRow[] }) {
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

  function openEdit(p: CmsPageRow) {
    setEditingId(p.id);
    setForm(toForm(p));
    setError(null);
    setOpen(true);
  }

  function save() {
    setError(null);
    const payload = {
      slug: form.slug,
      title: form.title,
      content: form.content,
      status: form.status,
      seoTitle: form.seoTitle || null,
      seoDescription: form.seoDescription || null,
    };
    startTransition(async () => {
      const res = await upsertCmsPage(editingId ? { ...payload, id: editingId } : payload);
      if (!res.ok) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Hapus halaman ini?")) return;
    startTransition(async () => {
      const res = await deleteCmsPage(id);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  const set = <K extends keyof FormShape>(k: K, v: FormShape[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Halaman CMS</h1>
        <Button onClick={openNew}>
          <Plus className="size-4" /> Tambah Halaman
        </Button>
      </div>

      {open && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{editingId ? "Edit Halaman" : "Halaman Baru"}</CardTitle>
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
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => set("slug", e.target.value)}
                  placeholder="otomatis dari judul jika kosong"
                />
              </div>
              <div>
                <Label>Status</Label>
                <select
                  className={selectCls}
                  value={form.status}
                  onChange={(e) => set("status", e.target.value as Status)}
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                </select>
              </div>
              <div>
                <Label>SEO Title</Label>
                <Input
                  value={form.seoTitle}
                  onChange={(e) => set("seoTitle", e.target.value)}
                  placeholder="opsional"
                />
              </div>
            </div>
            <div>
              <Label>Konten</Label>
              <Textarea
                className="min-h-40"
                value={form.content}
                onChange={(e) => set("content", e.target.value)}
              />
            </div>
            <div>
              <Label>SEO Description</Label>
              <Textarea
                value={form.seoDescription}
                onChange={(e) => set("seoDescription", e.target.value)}
                placeholder="opsional"
              />
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
              <th className="py-3 px-4 font-medium">Judul</th>
              <th className="py-3 px-4 font-medium">Slug</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                <td className="py-3 px-4 font-medium">{p.title}</td>
                <td className="py-3 px-4 font-mono text-[var(--muted-foreground)]">/{p.slug}</td>
                <td className="py-3 px-4">
                  <Badge variant={p.status === "PUBLISHED" ? "success" : "secondary"}>
                    {p.status}
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
            {pages.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-[var(--muted-foreground)]">
                  Belum ada halaman.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
