import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Package, Truck, XCircle } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { getOrderAdmin } from "@/server/services/orders";
import { formatIDR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ORDER_STATUS_INFO, OrderStatusBadge } from "../../_lib/order-status";
import { StatusForm } from "./status-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Detail Pesanan" };

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["PROCESSING", "REFUNDED", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) redirect("/login?next=/admin");

  const { id } = await params;
  const order = await getOrderAdmin(id);
  if (!order) notFound();

  const customer = await db.query.users.findFirst({ where: eq(users.id, order.userId) });
  const nextStatuses = ALLOWED_TRANSITIONS[order.status] ?? [];
  const ship = order.shipments[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/orders">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight font-mono">{order.orderNumber}</h1>
          <div className="text-xs text-[var(--muted-foreground)]">
            {new Date(order.placedAt).toLocaleString("id-ID")}
          </div>
        </div>
        <div className="ml-auto">
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Item</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.items.map((it) => (
                  <div key={it.id} className="flex justify-between text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{it.productNameSnapshot}</div>
                      <div className="text-[var(--muted-foreground)]">
                        {it.variantNameSnapshot} · {it.skuSnapshot} × {it.quantity}
                      </div>
                    </div>
                    <div className="font-medium shrink-0">{formatIDR(it.lineTotal)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t border-[var(--border)] pt-4 space-y-1 text-sm">
                <Row label="Subtotal" value={formatIDR(order.subtotal)} />
                {order.discountTotal > 0 && (
                  <Row label="Diskon" value={`- ${formatIDR(order.discountTotal)}`} />
                )}
                <Row label="Ongkir" value={order.shippingTotal === 0 ? "GRATIS" : formatIDR(order.shippingTotal)} />
                <Row label="PPN" value={formatIDR(order.taxTotal)} />
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>Total</span>
                  <span className="text-[var(--primary)]">{formatIDR(order.grandTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {order.history.map((h, i) => (
                  <li key={h.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="flex size-7 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                        {h.toStatus === "CANCELLED" ? (
                          <XCircle className="size-4" />
                        ) : h.toStatus === "SHIPPED" ? (
                          <Truck className="size-4" />
                        ) : h.toStatus === "DELIVERED" ? (
                          <Package className="size-4" />
                        ) : (
                          <CheckCircle2 className="size-4" />
                        )}
                      </span>
                      {i < order.history.length - 1 && (
                        <span className="w-px flex-1 bg-[var(--border)] my-1" />
                      )}
                    </div>
                    <div className="pb-2">
                      <div className="text-sm font-medium">
                        {ORDER_STATUS_INFO[h.toStatus]?.label ?? h.toStatus}
                      </div>
                      {h.note && <div className="text-xs text-[var(--muted-foreground)]">{h.note}</div>}
                      <div className="text-xs text-[var(--muted-foreground)]">
                        {new Date(h.createdAt).toLocaleString("id-ID")}
                        {h.actor ? ` · ${h.actor}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
                {order.history.length === 0 && (
                  <li className="text-sm text-[var(--muted-foreground)]">Belum ada riwayat.</li>
                )}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pelanggan</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div className="font-medium">{customer?.name ?? "—"}</div>
              <div className="text-[var(--muted-foreground)]">{customer?.email ?? "—"}</div>
              {order.shippingAddress && (
                <div className="mt-3 text-[var(--muted-foreground)] whitespace-pre-line">
                  {formatAddress(order.shippingAddress)}
                </div>
              )}
            </CardContent>
          </Card>

          {ship && (
            <Card>
              <CardHeader>
                <CardTitle>Pengiriman</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <Row label="Kurir" value={ship.courier ?? "—"} />
                <Row label="No. Resi" value={ship.trackingNumber ?? "—"} />
                <Row label="Status" value={ship.status} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Perbarui Status</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusForm orderId={order.id} nextStatuses={nextStatuses} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function formatAddress(addr: Record<string, unknown>): string {
  const parts = [
    addr.recipient,
    addr.phone,
    addr.line1,
    addr.line2,
    [addr.city, addr.province, addr.postalCode].filter(Boolean).join(", "),
  ];
  return parts.filter(Boolean).join("\n");
}
