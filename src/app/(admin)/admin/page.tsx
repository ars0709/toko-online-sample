import Link from "next/link";
import { redirect } from "next/navigation";
import { DollarSign, ShoppingBag, Receipt, Package, AlertTriangle } from "lucide-react";
import { count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventory, orderItems, orders, products, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { formatIDR } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatusBadge } from "./_lib/order-status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

const REVENUE_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export default async function AdminDashboard() {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) redirect("/login?next=/admin");

  const [
    [{ revenue }],
    [{ totalOrders }],
    [{ revenueOrders }],
    [{ productCount }],
    [{ lowStock }],
    bestSellers,
    recent,
  ] = await Promise.all([
    db
      .select({ revenue: sql<number>`coalesce(sum(${orders.grandTotal}),0)::int` })
      .from(orders)
      .where(inArray(orders.status, [...REVENUE_STATUSES])),
    db.select({ totalOrders: count() }).from(orders),
    db
      .select({ revenueOrders: count() })
      .from(orders)
      .where(inArray(orders.status, [...REVENUE_STATUSES])),
    db.select({ productCount: count() }).from(products),
    db
      .select({ lowStock: count() })
      .from(inventory)
      .where(sql`${inventory.quantityOnHand} - ${inventory.quantityReserved} < 5`),
    db
      .select({
        name: orderItems.productNameSnapshot,
        qty: sql<number>`sum(${orderItems.quantity})::int`,
      })
      .from(orderItems)
      .groupBy(orderItems.productNameSnapshot)
      .orderBy(desc(sql`sum(${orderItems.quantity})`))
      .limit(5),
    db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        grandTotal: orders.grandTotal,
        placedAt: orders.placedAt,
        email: users.email,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .orderBy(desc(orders.placedAt))
      .limit(8),
  ]);

  const aov = revenueOrders > 0 ? Math.round(revenue / revenueOrders) : 0;

  const metrics = [
    { label: "Total Pendapatan", value: formatIDR(revenue), icon: DollarSign },
    { label: "Jumlah Pesanan", value: totalOrders.toLocaleString("id-ID"), icon: ShoppingBag },
    { label: "Rata-rata Order (AOV)", value: formatIDR(aov), icon: Receipt },
    { label: "Jumlah Produk", value: productCount.toLocaleString("id-ID"), icon: Package },
    { label: "Stok Menipis", value: lowStock.toLocaleString("id-ID"), icon: AlertTriangle },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Ringkasan toko Anda.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--muted-foreground)]">{m.label}</span>
                <m.icon className="size-4 text-[var(--muted-foreground)]" />
              </div>
              <div className="mt-2 text-xl font-bold">{m.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>Produk Terlaris</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {bestSellers.length === 0 && (
              <p className="text-sm text-[var(--muted-foreground)]">Belum ada penjualan.</p>
            )}
            {bestSellers.map((b, i) => (
              <div key={b.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-[var(--muted-foreground)] w-4">{i + 1}.</span>
                  <span className="truncate">{b.name}</span>
                </span>
                <span className="font-medium shrink-0">{b.qty} terjual</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pesanan Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--muted-foreground)] border-b border-[var(--border)]">
                    <th className="py-2 pr-3 font-medium">No. Pesanan</th>
                    <th className="py-2 pr-3 font-medium">Pelanggan</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 pl-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((o) => (
                    <tr key={o.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-2 pr-3">
                        <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs hover:underline">
                          {o.orderNumber}
                        </Link>
                      </td>
                      <td className="py-2 pr-3 text-[var(--muted-foreground)] truncate max-w-[160px]">
                        {o.email ?? "—"}
                      </td>
                      <td className="py-2 pr-3">
                        <OrderStatusBadge status={o.status} />
                      </td>
                      <td className="py-2 pl-3 text-right font-medium">{formatIDR(o.grandTotal)}</td>
                    </tr>
                  ))}
                  {recent.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-[var(--muted-foreground)]">
                        Belum ada pesanan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
