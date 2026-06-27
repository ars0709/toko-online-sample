import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { SettingsForm, type SettingsShape } from "./settings-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pengaturan Situs" };

export default async function SettingsPage() {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) redirect("/login?next=/admin");

  const [row] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.id, "singleton"))
    .limit(1);

  const d = (row?.data ?? {}) as Record<string, unknown>;
  const social = (d.social ?? {}) as Record<string, unknown>;

  const initial: SettingsShape = {
    storeName: typeof d.storeName === "string" ? d.storeName : "",
    currency: typeof d.currency === "string" ? d.currency : "IDR",
    contactEmail: typeof d.contactEmail === "string" ? d.contactEmail : "",
    instagram: typeof social.instagram === "string" ? social.instagram : "",
    twitter: typeof social.twitter === "string" ? social.twitter : "",
    freeShippingThreshold: Number(d.freeShippingThreshold) || 0,
    taxRate: Number(d.taxRate) || 0,
  };

  return <SettingsForm initial={initial} />;
}
