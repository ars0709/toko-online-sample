import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { promotions } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { PromoManager, type PromoRow } from "./promo-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Promo Otomatis" };

export default async function AutoPromotionsPage() {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) redirect("/login?next=/admin");

  const rows = await db
    .select()
    .from(promotions)
    .orderBy(desc(promotions.priority), desc(promotions.createdAt))
    .limit(200);

  const data: PromoRow[] = rows.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    config: p.config,
    priority: p.priority,
    stackable: p.stackable,
    startsAt: p.startsAt ? p.startsAt.toISOString() : null,
    endsAt: p.endsAt ? p.endsAt.toISOString() : null,
    isActive: p.isActive,
  }));

  return <PromoManager promotions={data} />;
}
