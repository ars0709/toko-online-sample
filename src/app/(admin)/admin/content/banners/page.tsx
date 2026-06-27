import { redirect } from "next/navigation";
import { asc, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { banners } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { BannerManager, type BannerRow } from "./banner-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Banner" };

export default async function BannersPage() {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) redirect("/login?next=/admin");

  const rows = await db
    .select()
    .from(banners)
    .orderBy(asc(banners.placement), asc(banners.sortOrder), desc(banners.createdAt))
    .limit(200);

  const data: BannerRow[] = rows.map((b) => ({
    id: b.id,
    title: b.title,
    imageUrl: b.imageUrl,
    mobileImageUrl: b.mobileImageUrl,
    linkUrl: b.linkUrl,
    placement: b.placement,
    sortOrder: b.sortOrder,
    startsAt: b.startsAt ? b.startsAt.toISOString() : null,
    endsAt: b.endsAt ? b.endsAt.toISOString() : null,
    isActive: b.isActive,
  }));

  return <BannerManager banners={data} />;
}
