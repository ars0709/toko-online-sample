import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock, Package, Truck, XCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getOrderForUser } from "@/server/services/orders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Detail Pesanan" };

const statusInfo: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" | "secondary" }> = {
  PENDING_PAYMENT: { label: "Menunggu Pembayaran", variant: "warning" },
  PAID: { label: "Dibayar", variant: "success" },
  PROCESSING: { label: "Diproses", variant: "default" },
  SHIPPED: { label: "Dikirim", variant: "default" },
  DELIVERED: { label: "Diterima", variant: "success" },
  CANCELLED: { label: "Dibatalkan", variant: "destructive" },
  REFUNDED: { label: "Dikembalikan", variant: "secondary" },
};

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/orders/${id}`);

  const order = await getOrderForUser(id, user.id);
  if (!order) notFound();

  const info = statusInfo[order.status];
  const paid = order.status !== "PENDING_PAYMENT" && order.status !== "CANCELLED";

  return (
    <div className="container-page py-8 max-w-3xl">
      <div className="rounded-lg border border-[var(--border)] p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-sm text-[var(--muted-foreground)]">Nomor Pesanan</div>
            <div className="font-mono font-bold">{order.orderNumber}</div>
          </div>
          <Badge variant={info.variant}>{info.label}</Badge>
        </div>

        {order.status === "PAID" && (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-emerald-50 dark:bg-emerald-950/30 p-3 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-5" /> Pembayaran berhasil! Pesanan Anda sedang kami siapkan.
          </div>
        )}
        {order.status === "PENDING_PAYMENT" && (
          <div className="mt-4 flex items-center justify-between rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
            <span className="flex items-center gap-2 text-amber-700 dark:text-amber-400"><Clock className="size-5" /> Menunggu pembayaran</span>
            <Button asChild size="sm"><Link href={`/checkout/pay/${order.id}`}>Bayar Sekarang</Link></Button>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="mt-6 rounded-lg border border-[var(--border)] p-6">
        <h2 className="font-semibold mb-4">Status Pesanan</h2>
        <ol className="space-y-4">
          {order.history.map((h, i) => (
            <li key={h.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="flex size-7 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                  {h.toStatus === "CANCELLED" ? <XCircle className="size-4" /> : h.toStatus === "SHIPPED" ? <Truck className="size-4" /> : h.toStatus === "DELIVERED" ? <Package className="size-4" /> : <CheckCircle2 className="size-4" />}
                </span>
                {i < order.history.length - 1 && <span className="w-px flex-1 bg-[var(--border)] my-1" />}
              </div>
              <div className="pb-2">
                <div className="text-sm font-medium">{statusInfo[h.toStatus]?.label ?? h.toStatus}</div>
                {h.note && <div className="text-xs text-[var(--muted-foreground)]">{h.note}</div>}
                <div className="text-xs text-[var(--muted-foreground)]">{new Date(h.createdAt).toLocaleString("id-ID")}</div>
              </div>
            </li>
          ))}
        </ol>
        {order.shipments.length > 0 && order.shipments[0].trackingNumber && (
          <div className="mt-4 rounded-md bg-[var(--muted)] p-3 text-sm">
            Resi: <span className="font-mono font-medium">{order.shipments[0].trackingNumber}</span> ({order.shipments[0].courier})
          </div>
        )}
      </div>

      {/* Items */}
      <div className="mt-6 rounded-lg border border-[var(--border)] p-6">
        <h2 className="font-semibold mb-4">Item</h2>
        <div className="space-y-3">
          {order.items.map((it) => (
            <div key={it.id} className="flex justify-between text-sm">
              <div>
                <div className="font-medium">{it.productNameSnapshot}</div>
                <div className="text-[var(--muted-foreground)]">{it.variantNameSnapshot} × {it.quantity}</div>
              </div>
              <div className="font-medium">{formatIDR(it.lineTotal)}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-[var(--border)] pt-4 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Subtotal</span><span>{formatIDR(order.subtotal)}</span></div>
          {order.discountTotal > 0 && <div className="flex justify-between text-emerald-600"><span>Diskon</span><span>- {formatIDR(order.discountTotal)}</span></div>}
          <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Ongkir</span><span>{order.shippingTotal === 0 ? "GRATIS" : formatIDR(order.shippingTotal)}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">PPN</span><span>{formatIDR(order.taxTotal)}</span></div>
          <div className="flex justify-between font-bold text-base pt-1"><span>Total {paid ? "Dibayar" : ""}</span><span className="text-[var(--primary)]">{formatIDR(order.grandTotal)}</span></div>
        </div>
      </div>

      <div className="mt-6">
        <Button asChild variant="outline"><Link href="/account/orders">Lihat Semua Pesanan</Link></Button>
      </div>
    </div>
  );
}
