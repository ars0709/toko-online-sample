"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateSiteSettings } from "@/server/actions/admin-content";

export type SettingsShape = {
  storeName: string;
  currency: string;
  contactEmail: string;
  instagram: string;
  twitter: string;
  freeShippingThreshold: number;
  taxRate: number;
};

type FormShape = {
  storeName: string;
  currency: string;
  contactEmail: string;
  instagram: string;
  twitter: string;
  freeShippingThreshold: string;
  taxRate: string;
};

export function SettingsForm({ initial }: { initial: SettingsShape }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState<FormShape>({
    storeName: initial.storeName,
    currency: initial.currency,
    contactEmail: initial.contactEmail,
    instagram: initial.instagram,
    twitter: initial.twitter,
    freeShippingThreshold: String(initial.freeShippingThreshold),
    taxRate: String(initial.taxRate),
  });

  const set = <K extends keyof FormShape>(k: K, v: FormShape[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function save() {
    setError(null);
    setDone(false);
    startTransition(async () => {
      const res = await updateSiteSettings({
        storeName: form.storeName,
        currency: form.currency,
        contactEmail: form.contactEmail,
        instagram: form.instagram,
        twitter: form.twitter,
        freeShippingThreshold: Number(form.freeShippingThreshold) || 0,
        taxRate: Number(form.taxRate) || 0,
      });
      if (!res.ok) return setError(res.error);
      setDone(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Pengaturan Situs</h1>
      <Card>
        <CardHeader>
          <CardTitle>Informasi Toko</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Nama Toko</Label>
              <Input value={form.storeName} onChange={(e) => set("storeName", e.target.value)} />
            </div>
            <div>
              <Label>Mata Uang</Label>
              <Input value={form.currency} onChange={(e) => set("currency", e.target.value)} />
            </div>
            <div>
              <Label>Email Kontak</Label>
              <Input
                type="email"
                value={form.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
              />
            </div>
            <div>
              <Label>Instagram</Label>
              <Input
                value={form.instagram}
                onChange={(e) => set("instagram", e.target.value)}
                placeholder="@toko"
              />
            </div>
            <div>
              <Label>Twitter</Label>
              <Input
                value={form.twitter}
                onChange={(e) => set("twitter", e.target.value)}
                placeholder="@toko"
              />
            </div>
            <div>
              <Label>Gratis Ongkir Mulai (Rp)</Label>
              <Input
                type="number"
                min={0}
                value={form.freeShippingThreshold}
                onChange={(e) => set("freeShippingThreshold", e.target.value)}
              />
            </div>
            <div>
              <Label>Pajak (%)</Label>
              <Input
                type="number"
                min={0}
                step="0.1"
                value={form.taxRate}
                onChange={(e) => set("taxRate", e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
          {done && !error && <p className="text-sm text-emerald-600">Tersimpan.</p>}
          <div>
            <Button onClick={save} disabled={pending}>
              {pending ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
