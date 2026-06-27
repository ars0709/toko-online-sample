import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { faqs } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { FaqManager, type FaqRow } from "./faq-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "FAQ" };

export default async function FaqPage() {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) redirect("/login?next=/admin");

  const rows = await db
    .select()
    .from(faqs)
    .orderBy(asc(faqs.category), asc(faqs.sortOrder))
    .limit(300);

  const data: FaqRow[] = rows.map((f) => ({
    id: f.id,
    category: f.category,
    question: f.question,
    answer: f.answer,
    sortOrder: f.sortOrder,
    isActive: f.isActive,
  }));

  return <FaqManager faqs={data} />;
}
