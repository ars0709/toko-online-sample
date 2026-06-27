"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteBlogPost, upsertBlogPost } from "@/server/actions/admin-content";

type Status = "DRAFT" | "PUBLISHED";

export type BlogPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  body: string;
  tags: string[];
  status: Status;
  seoTitle: string | null;
  seoDescription: string | null;
};

const selectCls =
  "flex h-10 w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

type FormShape = {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  body: string;
  tags: string;
  status: Status;
  seoTitle: string;
  seoDescription: string;
};

const empty: FormShape = {
  slug: "",
  title: "",
  excerpt: "",
  coverImage: "",
  body: "",
  tags: "",
  status: "DRAFT",
  seoTitle: "",
  seoDescription: "",
};

function toForm(p: BlogPostRow): FormShape {
  return {
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt ?? "",
    coverImage: p.coverImage ?? "",
    body: p.body,
    tags: p.tags.join(", "),
    status: p.status,
    seoTitle: p.seoTitle ?? "",
    seoDescription: p.seoDescription ?? "",
  };
}

export function BlogManager({ posts }: { posts: BlogPostRow[] }) {
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

  function openEdit(p: BlogPostRow) {
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
      excerpt: form.excerpt || null,
      coverImage: form.coverImage || null,
      body: form.body,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      status: form.status,
      seoTitle: form.seoTitle || null,
      seoDescription: form.seoDescription || null,
    };
    startTransition(async () => {
      const res = await upsertBlogPost(editingId ? { ...payload, id: editingId } : payload);
      if (!res.ok) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Hapus artikel ini?")) return;
    startTransition(async () => {
      const res = await deleteBlogPost(id);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  const set = <K extends keyof FormShape>(k: K, v: FormShape[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Blog</h1>
        <Button onClick={openNew}>
          <Plus className="size-4" /> Tambah Artikel
        </Button>
      </div>

      {open && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{editingId ? "Edit Artikel" : "Artikel Baru"}</CardTitle>
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
                <Label>Cover Image URL</Label>
                <Input
                  value={form.coverImage}
                  onChange={(e) => set("coverImage", e.target.value)}
                  placeholder="opsional"
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
              <div className="sm:col-span-2">
                <Label>Tag (pisahkan dengan koma)</Label>
                <Input
                  value={form.tags}
                  onChange={(e) => set("tags", e.target.value)}
                  placeholder="promo, tips, baru"
                />
              </div>
            </div>
            <div>
              <Label>Ringkasan</Label>
              <Textarea
                value={form.excerpt}
                onChange={(e) => set("excerpt", e.target.value)}
                placeholder="opsional"
              />
            </div>
            <div>
              <Label>Isi Artikel</Label>
              <Textarea
                className="min-h-48"
                value={form.body}
                onChange={(e) => set("body", e.target.value)}
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
              <th className="py-3 px-4 font-medium">Tag</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                <td className="py-3 px-4 font-medium">{p.title}</td>
                <td className="py-3 px-4 font-mono text-[var(--muted-foreground)]">/{p.slug}</td>
                <td className="py-3 px-4 text-[var(--muted-foreground)]">
                  {p.tags.length ? p.tags.join(", ") : "—"}
                </td>
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
            {posts.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--muted-foreground)]">
                  Belum ada artikel.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
