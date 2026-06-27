"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createFaq, deleteFaq, updateFaq } from "@/server/actions/admin-content";

export type FaqRow = {
  id: string;
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
};

type FormShape = {
  category: string;
  question: string;
  answer: string;
  sortOrder: string;
  isActive: boolean;
};

const empty: FormShape = {
  category: "Umum",
  question: "",
  answer: "",
  sortOrder: "0",
  isActive: true,
};

function toForm(f: FaqRow): FormShape {
  return {
    category: f.category,
    question: f.question,
    answer: f.answer,
    sortOrder: String(f.sortOrder),
    isActive: f.isActive,
  };
}

export function FaqManager({ faqs }: { faqs: FaqRow[] }) {
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

  function openEdit(f: FaqRow) {
    setEditingId(f.id);
    setForm(toForm(f));
    setError(null);
    setOpen(true);
  }

  function save() {
    setError(null);
    const payload = {
      category: form.category,
      question: form.question,
      answer: form.answer,
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
    };
    startTransition(async () => {
      const res = editingId
        ? await updateFaq({ ...payload, id: editingId })
        : await createFaq(payload);
      if (!res.ok) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Hapus FAQ ini?")) return;
    startTransition(async () => {
      const res = await deleteFaq(id);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  const set = <K extends keyof FormShape>(k: K, v: FormShape[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">FAQ</h1>
        <Button onClick={openNew}>
          <Plus className="size-4" /> Tambah FAQ
        </Button>
      </div>

      {open && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{editingId ? "Edit FAQ" : "FAQ Baru"}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Kategori</Label>
                <Input value={form.category} onChange={(e) => set("category", e.target.value)} />
              </div>
              <div>
                <Label>Urutan</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => set("sortOrder", e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Pertanyaan</Label>
              <Input value={form.question} onChange={(e) => set("question", e.target.value)} />
            </div>
            <div>
              <Label>Jawaban</Label>
              <Textarea
                className="min-h-28"
                value={form.answer}
                onChange={(e) => set("answer", e.target.value)}
              />
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
              <th className="py-3 px-4 font-medium">Kategori</th>
              <th className="py-3 px-4 font-medium">Pertanyaan</th>
              <th className="py-3 px-4 font-medium">Urutan</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {faqs.map((f) => (
              <tr key={f.id} className="border-b border-[var(--border)] last:border-0">
                <td className="py-3 px-4 text-[var(--muted-foreground)]">{f.category}</td>
                <td className="py-3 px-4 font-medium">{f.question}</td>
                <td className="py-3 px-4 text-[var(--muted-foreground)]">{f.sortOrder}</td>
                <td className="py-3 px-4">
                  <Badge variant={f.isActive ? "success" : "secondary"}>
                    {f.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(f)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => remove(f.id)}
                      disabled={pending}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {faqs.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--muted-foreground)]">
                  Belum ada FAQ.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
