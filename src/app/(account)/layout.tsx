import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, MapPin, User, Code2, LogOut, LayoutDashboard } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { logoutAction } from "@/server/actions/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  const links = [
    { href: "/account", label: "Profil", icon: User },
    { href: "/account/orders", label: "Pesanan", icon: Package },
    { href: "/account/addresses", label: "Alamat", icon: MapPin },
    { href: "/developer", label: "Developer", icon: Code2 },
  ];

  return (
    <>
      <SiteHeader />
      <main className="flex-1 container-page py-8">
        <div className="grid md:grid-cols-[220px_1fr] gap-8">
          <aside className="space-y-1">
            <div className="px-3 py-2 mb-2">
              <div className="font-semibold">{user.name}</div>
              <div className="text-xs text-[var(--muted-foreground)]">{user.email}</div>
            </div>
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-[var(--accent)]">
                <l.icon className="size-4" /> {l.label}
              </Link>
            ))}
            {user.role === "ADMIN" && (
              <Link href="/admin" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-[var(--accent)]">
                <LayoutDashboard className="size-4" /> Admin Panel
              </Link>
            )}
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" className="w-full justify-start text-[var(--destructive)]">
                <LogOut className="size-4" /> Keluar
              </Button>
            </form>
          </aside>
          <div>{children}</div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
