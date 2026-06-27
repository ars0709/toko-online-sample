import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cmsPages } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await db.query.cmsPages.findFirst({ where: eq(cmsPages.slug, slug) });
  return { title: p?.seoTitle ?? p?.title ?? "Halaman", description: p?.seoDescription };
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await db.query.cmsPages.findFirst({
    where: and(eq(cmsPages.slug, slug), eq(cmsPages.status, "PUBLISHED")),
  });
  if (!page) notFound();

  return (
    <div className="container-page py-12 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">{page.title}</h1>
      <div className="leading-relaxed whitespace-pre-wrap text-[var(--muted-foreground)]">{page.content}</div>
    </div>
  );
}
