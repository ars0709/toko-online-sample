import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Star } from "lucide-react";
import { db } from "@/lib/db";
import { products, reviews, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ReviewActions } from "./review-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ulasan" };

const statusVariant: Record<string, "success" | "warning" | "destructive"> = {
  PUBLISHED: "success",
  PENDING: "warning",
  REJECTED: "destructive",
};

export default async function ReviewsPage() {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) redirect("/login?next=/admin");

  const rows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      status: reviews.status,
      createdAt: reviews.createdAt,
      productName: products.name,
      authorName: users.name,
      authorEmail: users.email,
    })
    .from(reviews)
    .leftJoin(products, eq(reviews.productId, products.id))
    .leftJoin(users, eq(reviews.userId, users.id))
    .orderBy(desc(reviews.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Ulasan</h1>

      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{r.productName ?? "Produk dihapus"}</span>
                    <Badge variant={statusVariant[r.status] ?? "secondary"}>{r.status}</Badge>
                    <span className="flex items-center gap-0.5 text-amber-500 text-xs">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={i < r.rating ? "size-3.5 fill-current" : "size-3.5 opacity-30"}
                        />
                      ))}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">
                    {r.authorName ?? "Anonim"} · {r.authorEmail ?? "—"} ·{" "}
                    {new Date(r.createdAt).toLocaleDateString("id-ID")}
                  </div>
                  {r.title && <div className="text-sm font-medium pt-1">{r.title}</div>}
                  {r.body && <p className="text-sm text-[var(--muted-foreground)]">{r.body}</p>}
                </div>
                <ReviewActions id={r.id} status={r.status} />
              </div>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && (
          <p className="text-sm text-[var(--muted-foreground)]">Belum ada ulasan.</p>
        )}
      </div>
    </div>
  );
}
