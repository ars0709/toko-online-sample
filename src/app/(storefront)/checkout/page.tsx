import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { addresses } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { readCart } from "@/lib/cart-context";
import { CartClient } from "@/components/cart-client";
import { CheckoutForm } from "@/components/checkout-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/checkout");

  const cart = await readCart();
  if (!cart || cart.items.length === 0) redirect("/cart");

  const savedAddresses = await db.select().from(addresses).where(eq(addresses.userId, user.id));

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      <div className="grid lg:grid-cols-[1fr_420px] gap-8">
        <CheckoutForm
          addresses={savedAddresses.map((a) => ({
            id: a.id,
            label: a.label,
            recipient: a.recipient,
            line1: a.line1,
            city: a.city,
            province: a.province,
            postalCode: a.postalCode,
            phone: a.phone,
          }))}
          couponCode={cart.couponCode}
        />
        <div>
          <h2 className="font-semibold mb-3">Ringkasan Pesanan</h2>
          <CartClient cart={cart} checkout />
        </div>
      </div>
    </div>
  );
}
