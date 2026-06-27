import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { BlogManager, type BlogPostRow } from "./blog-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blog" };

export default async function BlogPage() {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) redirect("/login?next=/admin");

  const rows = await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt)).limit(200);

  const data: BlogPostRow[] = rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    coverImage: p.coverImage,
    body: p.body,
    tags: p.tags,
    status: p.status,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
  }));

  return <BlogManager posts={data} />;
}
