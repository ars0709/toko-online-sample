import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blog" };

export default async function BlogPage() {
  const posts = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.status, "PUBLISHED"))
    .orderBy(desc(blogPosts.publishedAt));

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold mb-6">Blog</h1>
      <div className="grid md:grid-cols-3 gap-6">
        {posts.map((p) => (
          <Link key={p.id} href={`/blog/${p.slug}`} className="rounded-lg border border-[var(--border)] overflow-hidden hover:shadow-md transition-shadow">
            <div className="aspect-video bg-[var(--muted)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.coverImage ?? ""} alt={p.title} className="h-full w-full object-cover" />
            </div>
            <div className="p-4">
              <h2 className="font-semibold line-clamp-2">{p.title}</h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)] line-clamp-2">{p.excerpt}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
