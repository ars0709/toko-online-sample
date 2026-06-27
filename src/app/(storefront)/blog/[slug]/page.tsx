import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await db.query.blogPosts.findFirst({ where: eq(blogPosts.slug, slug) });
  return { title: p?.seoTitle ?? p?.title ?? "Blog", description: p?.seoDescription ?? p?.excerpt };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await db.query.blogPosts.findFirst({
    where: and(eq(blogPosts.slug, slug), eq(blogPosts.status, "PUBLISHED")),
  });
  if (!post) notFound();

  return (
    <article className="container-page py-8 max-w-3xl">
      <h1 className="text-3xl font-bold">{post.title}</h1>
      <div className="mt-2 text-sm text-[var(--muted-foreground)]">
        {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("id-ID") : ""}
      </div>
      {post.coverImage && (
        <div className="mt-6 aspect-video overflow-hidden rounded-lg bg-[var(--muted)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.coverImage} alt={post.title} className="h-full w-full object-cover" />
        </div>
      )}
      <div className="mt-6 prose-sm leading-relaxed whitespace-pre-wrap">{post.body}</div>
    </article>
  );
}
