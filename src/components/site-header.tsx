import Link from "next/link";
import { ShoppingCart, User, LayoutDashboard, Store, Code2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { readCartCount } from "@/lib/cart-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const [user, count] = await Promise.all([getCurrentUser(), readCartCount()]);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Store className="size-6 text-[var(--primary)]" />
          <span>Toko<span className="text-[var(--primary)]">Sample</span></span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-4 text-sm">
          <Link href="/products" className="px-3 py-2 rounded-md hover:bg-[var(--accent)]">Produk</Link>
          <Link href="/promo" className="px-3 py-2 rounded-md hover:bg-[var(--accent)]">Promo</Link>
          <Link href="/blog" className="px-3 py-2 rounded-md hover:bg-[var(--accent)]">Blog</Link>
          <Link href="/api-docs" className="px-3 py-2 rounded-md hover:bg-[var(--accent)]">API</Link>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />

          <Link href="/cart" className="relative">
            <Button variant="ghost" size="icon" aria-label="Keranjang">
              <ShoppingCart />
            </Button>
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-bold text-[var(--primary-foreground)]">
                {count}
              </span>
            )}
          </Link>

          {user?.role === "ADMIN" && (
            <Button asChild variant="ghost" size="icon" aria-label="Admin">
              <Link href="/admin"><LayoutDashboard /></Link>
            </Button>
          )}

          {user ? (
            <Button asChild variant="ghost" size="icon" aria-label="Akun">
              <Link href="/account"><User /></Link>
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link href="/login">Masuk</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
