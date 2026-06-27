import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  TicketPercent,
  Star,
  KeyRound,
  FileText,
  Megaphone,
  Store,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";

export const metadata = { title: "Admin" };

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Produk", icon: Package },
  { href: "/admin/orders", label: "Pesanan", icon: ShoppingBag },
  { href: "/admin/coupons", label: "Kupon", icon: TicketPercent },
  { href: "/admin/content", label: "Konten", icon: FileText },
  { href: "/admin/promotions", label: "Promosi", icon: Megaphone },
  { href: "/admin/reviews", label: "Ulasan", icon: Star },
  { href: "/admin/api-keys", label: "API Keys", icon: KeyRound },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) redirect("/login?next=/admin");

  return (
    <div className="flex-1 grid md:grid-cols-[240px_1fr]">
      <aside className="border-r border-[var(--border)] bg-[var(--card)] md:min-h-screen">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <Link href="/admin" className="font-bold tracking-tight text-lg">
            Toko <span className="text-[var(--primary)]">Admin</span>
          </Link>
          <div className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">{admin.email}</div>
        </div>
        <nav className="p-3 space-y-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
            >
              <l.icon className="size-4" /> {l.label}
            </Link>
          ))}
          <div className="my-2 border-t border-[var(--border)]" />
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
          >
            <Store className="size-4" /> Kembali ke Toko
          </Link>
        </nav>
      </aside>
      <main className="min-w-0 p-6 md:p-8">{children}</main>
    </div>
  );
}
