import Link from "next/link";
import { Package } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { listOrdersForUser } from "@/server/services/orders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pesanan Saya" };

const statusLabel: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" | "secondary" }> = {
  PENDING_PAYMENT: { label: "Menunggu Pembayaran", variant: "warning" },
  PAID: { label: "Dibayar", variant: "success" },
  PROCESSING: { label: "Diproses", variant: "default" },
  SHIPPED: { label: "Dikirim", variant: "default" },
  DELIVERED: { label: "Diterima", variant: "success" },
  CANCELLED: { label: "Dibatalkan", variant: "destructive" },
  REFUNDED: { label: "Dikembalikan", variant: "secondary" },
};

export default async function AccountOrdersPage() {
  const user = (await getCurrentUser())!;
  const orders = await listOrdersForUser(user.id);

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <Package className="mx-auto size-12 text-[var(--muted-foreground)]" />
        <h1 className="mt-4 text-xl font-bold">Belum ada pesanan</h1>
        <Button asChild className="mt-6"><Link href="/products">Mulai Belanja</Link></Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Pesanan Saya</h1>
      <div className="space-y-3">
        {orders.map((o) => {
          const info = statusLabel[o.status];
          return (
            <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center justify-between rounded-lg border border-[var(--border)] p-4 hover:border-[var(--primary)] transition-colors">
              <div>
                <div className="font-mono text-sm font-medium">{o.orderNumber}</div>
                <div className="text-xs text-[var(--muted-foreground)]">{new Date(o.placedAt).toLocaleString("id-ID")}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-[var(--primary)]">{formatIDR(o.grandTotal)}</div>
                <Badge variant={info.variant} className="mt-1">{info.label}</Badge>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
