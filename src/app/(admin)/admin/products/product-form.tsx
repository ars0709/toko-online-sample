"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { slugify } from "@/lib/utils";
import { createProduct, updateProduct, upsertVariant } from "@/server/actions/admin";

type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type VariantData = {
  id: string;
  sku: string;
  name: string;
  price: number;
  quantityOnHand: number;
};

export type ProductData = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  description: string;
  basePrice: number;
  status: ProductStatus;
};

const selectCls =
  "flex h-10 w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

export function ProductForm({
  mode,
  product,
  variants = [],
  images = [],
}: {
  mode: "create" | "edit";
  product?: ProductData;
  variants?: VariantData[];
  images?: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [basePrice, setBasePrice] = useState(String(product?.basePrice ?? ""));
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? "DRAFT");
  const [imagesText, setImagesText] = useState(images.join("\n"));

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const base = {
        name,
        slug: slug || undefined,
        brand: brand || undefined,
        description,
        basePrice: Number(basePrice),
        status,
      };
      if (mode === "create") {
        const res = await createProduct(base);
        if (!res.ok) return setError(res.error);
        router.push(`/admin/products/${res.id}/edit`);
      } else if (product) {
        const res = await updateProduct({
          ...base,
          id: product.id,
          imageUrls: imagesText.split("\n").map((s) => s.trim()).filter(Boolean),
        });
        if (!res.ok) return setError(res.error);
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Detail Produk</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Nama</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  if (mode === "create" && !slug && name) setSlug(slugify(name));
                }}
                placeholder="Nama produk"
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="kosongkan untuk otomatis"
              />
            </div>
            <div>
              <Label>Brand</Label>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Brand" />
            </div>
            <div>
              <Label>Harga Dasar (Rp)</Label>
              <Input
                type="number"
                min={0}
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Status</Label>
              <select
                className={selectCls}
                value={status}
                onChange={(e) => setStatus(e.target.value as ProductStatus)}
              >
                <option value="DRAFT">DRAFT</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          </div>
          <div>
            <Label>Deskripsi</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi produk"
              className="min-h-28"
            />
          </div>

          {mode === "edit" && (
            <div>
              <Label>URL Gambar (satu per baris)</Label>
              <Textarea
                value={imagesText}
                onChange={(e) => setImagesText(e.target.value)}
                placeholder="https://..."
                className="min-h-24 font-mono text-xs"
              />
            </div>
          )}

          {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
          {saved && <p className="text-sm text-emerald-600">Tersimpan.</p>}

          <Button onClick={submit} disabled={pending}>
            <Save className="size-4" />
            {pending ? "Menyimpan..." : mode === "create" ? "Buat Produk" : "Simpan Perubahan"}
          </Button>
        </CardContent>
      </Card>

      {mode === "edit" && product && (
        <Card>
          <CardHeader>
            <CardTitle>Varian &amp; Stok</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="hidden sm:grid grid-cols-[1fr_1fr_120px_100px_auto] gap-2 text-xs text-[var(--muted-foreground)] px-1">
              <span>SKU</span>
              <span>Nama</span>
              <span>Harga</span>
              <span>Stok</span>
              <span />
            </div>
            {variants.map((v) => (
              <VariantRow key={v.id} productId={product.id} variant={v} />
            ))}
            <VariantRow productId={product.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function VariantRow({ productId, variant }: { productId: string; variant?: VariantData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sku, setSku] = useState(variant?.sku ?? "");
  const [name, setName] = useState(variant?.name ?? "");
  const [price, setPrice] = useState(String(variant?.price ?? ""));
  const [qty, setQty] = useState(String(variant?.quantityOnHand ?? ""));
  const isNew = !variant;

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await upsertVariant({
        productId,
        variantId: variant?.id,
        sku,
        name,
        price: Number(price),
        quantityOnHand: Number(qty || 0),
      });
      if (!res.ok) return setError(res.error);
      if (isNew) {
        setSku("");
        setName("");
        setPrice("");
        setQty("");
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      <div className="grid sm:grid-cols-[1fr_1fr_120px_100px_auto] gap-2">
        <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU" />
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama varian" />
        <Input
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Harga"
        />
        <Input
          type="number"
          min={0}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="Stok"
        />
        <Button
          type="button"
          variant={isNew ? "secondary" : "outline"}
          size="sm"
          onClick={save}
          disabled={pending}
        >
          {isNew ? <Plus className="size-4" /> : <Save className="size-4" />}
          {isNew ? "Tambah" : "Simpan"}
        </Button>
      </div>
      {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
    </div>
  );
}
