import { redirect } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { flashSaleItems, flashSales, productVariants, products } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { FlashManager, type FlashSaleRow, type VariantOption } from "./flash-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Flash Sale" };

export default async function FlashSalesPage() {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) redirect("/login?next=/admin");

  const sales = await db.select().from(flashSales).orderBy(desc(flashSales.createdAt)).limit(100);

  const itemRows = await db
    .select({
      id: flashSaleItems.id,
      flashSaleId: flashSaleItems.flashSaleId,
      variantId: flashSaleItems.variantId,
      salePrice: flashSaleItems.salePrice,
      stockLimit: flashSaleItems.stockLimit,
      soldCount: flashSaleItems.soldCount,
      sku: productVariants.sku,
      variantName: productVariants.name,
      productName: products.name,
    })
    .from(flashSaleItems)
    .innerJoin(productVariants, eq(flashSaleItems.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id));

  const variantRows = await db
    .select({
      id: productVariants.id,
      sku: productVariants.sku,
      variantName: productVariants.name,
      price: productVariants.price,
      productName: products.name,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .orderBy(asc(products.name))
    .limit(500);

  const data: FlashSaleRow[] = sales.map((s) => ({
    id: s.id,
    name: s.name,
    bannerImage: s.bannerImage,
    status: s.status,
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    items: itemRows
      .filter((i) => i.flashSaleId === s.id)
      .map((i) => ({
        id: i.id,
        variantId: i.variantId,
        salePrice: i.salePrice,
        stockLimit: i.stockLimit,
        soldCount: i.soldCount,
        label: `${i.productName} — ${i.variantName} (${i.sku})`,
      })),
  }));

  const variants: VariantOption[] = variantRows.map((v) => ({
    id: v.id,
    label: `${v.productName} — ${v.variantName} (${v.sku})`,
    price: v.price,
  }));

  return <FlashManager sales={data} variants={variants} />;
}
