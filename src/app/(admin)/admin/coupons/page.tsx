import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { CouponManager, type CouponRow } from "./coupon-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kupon" };

export default async function CouponsPage() {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) redirect("/login?next=/admin");

  const rows = await db.select().from(coupons).orderBy(desc(coupons.createdAt)).limit(100);

  const data: CouponRow[] = rows.map((c) => ({
    id: c.id,
    code: c.code,
    type: c.type,
    value: c.value,
    minSubtotal: c.minSubtotal,
    maxDiscount: c.maxDiscount,
    usageLimit: c.usageLimit,
    usedCount: c.usedCount,
    perUserLimit: c.perUserLimit,
    firstOrderOnly: c.firstOrderOnly,
    channel: c.channel,
    isActive: c.isActive,
  }));

  return <CouponManager coupons={data} />;
}
