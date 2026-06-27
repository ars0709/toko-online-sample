import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventory, productImages, productVariants, products } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { ProductForm, type VariantData } from "../../product-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit Produk" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) redirect("/login?next=/admin");

  const { id } = await params;

  const product = await db.query.products.findFirst({ where: eq(products.id, id) });
  if (!product) notFound();

  const [vrows, imgRows] = await Promise.all([
    db
      .select({
        id: productVariants.id,
        sku: productVariants.sku,
        name: productVariants.name,
        price: productVariants.price,
        quantityOnHand: inventory.quantityOnHand,
      })
      .from(productVariants)
      .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
      .where(eq(productVariants.productId, id))
      .orderBy(asc(productVariants.createdAt)),
    db
      .select({ url: productImages.url })
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(asc(productImages.sortOrder)),
  ]);

  const variants: VariantData[] = vrows.map((v) => ({
    id: v.id,
    sku: v.sku,
    name: v.name,
    price: v.price,
    quantityOnHand: v.quantityOnHand ?? 0,
  }));

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/products">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight truncate">{product.name}</h1>
      </div>
      <ProductForm
        mode="edit"
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          brand: product.brand,
          description: product.description,
          basePrice: product.basePrice,
          status: product.status,
        }}
        variants={variants}
        images={imgRows.map((i) => i.url)}
      />
    </div>
  );
}
