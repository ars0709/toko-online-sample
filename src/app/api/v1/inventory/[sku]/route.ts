import { eq } from "drizzle-orm";
import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk, apiError } from "@/lib/api/response";
import { db } from "@/lib/db";
import { inventory, productVariants } from "@/lib/db/schema";

export const GET = withApi<{ sku: string }>(
  async (_req, { params }) => {
    const rows = await db
      .select({
        sku: productVariants.sku,
        variantId: productVariants.id,
        onHand: inventory.quantityOnHand,
        reserved: inventory.quantityReserved,
      })
      .from(productVariants)
      .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
      .where(eq(productVariants.sku, params.sku))
      .limit(1);

    const row = rows[0];
    if (!row) return apiError("not_found", "SKU not found", 404);

    const onHand = row.onHand ?? 0;
    const reserved = row.reserved ?? 0;
    return apiOk({
      sku: row.sku,
      variantId: row.variantId,
      onHand,
      reserved,
      available: Math.max(0, onHand - reserved),
    });
  },
  { auth: "apikey", scope: "catalog:read" },
);

export { OPTIONS };
