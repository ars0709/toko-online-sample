import { redirect } from "next/navigation";
import Link from "next/link";
import { Image as ImageIcon, FileText, Newspaper, HelpCircle, Settings } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Konten" };

const sections = [
  {
    href: "/admin/content/banners",
    label: "Banner",
    desc: "Kelola banner beranda, kategori, & checkout.",
    icon: ImageIcon,
  },
  {
    href: "/admin/content/pages",
    label: "Halaman CMS",
    desc: "Halaman statis seperti Tentang Kami & Kebijakan.",
    icon: FileText,
  },
  {
    href: "/admin/content/blog",
    label: "Blog",
    desc: "Tulis & kelola artikel blog.",
    icon: Newspaper,
  },
  {
    href: "/admin/content/faq",
    label: "FAQ",
    desc: "Pertanyaan yang sering diajukan.",
    icon: HelpCircle,
  },
  {
    href: "/admin/content/settings",
    label: "Pengaturan Situs",
    desc: "Nama toko, kontak, sosial media, & lainnya.",
    icon: Settings,
  },
];

export default async function ContentPage() {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) redirect("/login?next=/admin");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Konten</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
