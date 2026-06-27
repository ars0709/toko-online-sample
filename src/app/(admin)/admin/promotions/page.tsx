import { redirect } from "next/navigation";
import Link from "next/link";
import { Zap, Sparkles } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Promosi" };

const sections = [
  {
    href: "/admin/promotions/auto",
    label: "Promo Otomatis",
    desc: "Diskon keranjang, gratis ongkir, beli X gratis Y, & bundle.",
    icon: Sparkles,
  },
  {
    href: "/admin/promotions/flash",
    label: "Flash Sale",
    desc: "Penjualan kilat berjadwal dengan harga & stok khusus.",
    icon: Zap,
  },
];

export default async function PromotionsPage() {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) redirect("/login?next=/admin");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Promosi</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="h-full transition-colors hover:border-[var(--primary)]">
              <CardContent className="flex items-start gap-3 p-5">
                <div className="rounded-md bg-[var(--muted)] p-2.5">
                  <s.icon className="size-5 text-[var(--primary)]" />
                </div>
                <div>
                  <div className="font-semibold">{s.label}</div>
                  <div className="mt-0.5 text-sm text-[var(--muted-foreground)]">{s.desc}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
