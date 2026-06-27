import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { readCart } from "@/lib/cart-context";
import { CartClient } from "@/components/cart-client";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Keranjang" };

export default async function CartPage() {
  const cart = await readCart();

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container-page py-16 text-center">
        <ShoppingCart className="mx-auto size-12 text-[var(--muted-foreground)]" />
        <h1 className="mt-4 text-xl font-bold">Keranjang kosong</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Yuk mulai belanja produk favoritmu.</p>
        <Button asChild className="mt-6"><Link href="/products">Jelajahi Produk</Link></Button>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold mb-6">Keranjang Belanja</h1>
      <CartClient cart={cart} />
    </div>
  );
}
