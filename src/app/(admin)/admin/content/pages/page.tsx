import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { cmsPages } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { PageManager, type CmsPageRow } from "./page-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Halaman CMS" };

export default async function CmsPagesPage() {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) redirect("/login?next=/admin");

  const rows = await db.select().from(cmsPages).orderBy(desc(cmsPages.createdAt)).limit(200);

  const data: CmsPageRow[] = rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    content: p.content,
    status: p.status,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
  }));

  return <PageManager pages={data} />;
}
