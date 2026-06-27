import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { CreditCard, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { payMockAction } from "@/server/actions/payment";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pembayaran" };

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/checkout/pay/${id}`);

  const order = await db.query.orders.findFirst({ where: eq(orders.id, id) });
  if (!order || order.userId !== user.id) notFound();
  if (order.status !== "PENDING_PAYMENT") redirect(`/orders/${id}`);

  const payPaid = payMockAction.bind(null, id, "PAID");
  const payFailed = payMockAction.bind(null, id, "FAILED");

  return (
    <div className="container-page py-16 max-w-md mx-auto">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[var(--primary)]/10">
          <CreditCard className="size-7 text-[var(--primary)]" />
        </div>
        <h1 className="mt-4 text-xl font-bold">Pembayaran (Mock Gateway)</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Pesanan <span className="font-mono">{order.orderNumber}</span>
        </p>
        <div className="mt-4 text-3xl font-bold text-[var(--primary)]">{formatIDR(order.grandTotal)}</div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-[var(--muted-foreground)]">
          <ShieldCheck className="size-4 text-emerald-500" /> Transaksi diverifikasi dengan HMAC signature
        </div>

        <div className="mt-6 space-y-3">
          <form action={payPaid}>
            <Button type="submit" size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700">
              Bayar Berhasil
            </Button>
          </form>
          <form action={payFailed}>
            <Button type="submit" size="lg" variant="outline" className="w-full">
              Bayar Gagal
            </Button>
          </form>
        </div>
        <p className="mt-4 text-xs text-[var(--muted-foreground)]">
          Ini simulasi. Pada produksi, gateway (Midtrans/Xendit/Stripe) memanggil webhook
          <code className="mx-1">/api/v1/payments/webhook</code> yang ditandatangani.
        </p>
      </div>
    </div>
  );
}
