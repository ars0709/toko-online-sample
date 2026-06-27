import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { formatIDR, cn } from "@/lib/utils";
import { OrderStatusBadge } from "../_lib/order-status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pesanan" };

const STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

type StatusFilter = (typeof STATUSES)[number];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) redirect("/login?next=/admin");

  const statusParam = (await searchParams).status;
  const active = STATUSES.includes(statusParam as StatusFilter)
    ? (statusParam as StatusFilter)
    : undefined;

  const rows = await db
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
    .where(active ? eq(orders.status, active) : undefined)
    .orderBy(desc(orders.placedAt))
    .limit(100);

  const tabs: { label: string; value?: StatusFilter }[] = [
    { label: "Semua", value: undefined },
    ...STATUSES.map((s) => ({ label: s, value: s })),
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Pesanan</h1>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const isActive = t.value === active;
          return (
            <Link
              key={t.label}
              href={t.value ? `/admin/orders?status=${t.value}` : "/admin/orders"}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium border border-[var(--border)]",
                isActive
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "hover:bg-[var(--accent)]",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <div className="rounded-lg border border-[var(--border)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--muted-foreground)] border-b border-[var(--border)] bg-[var(--muted)]/40">
              <th className="py-3 px-4 font-medium">No. Pesanan</th>
              <th className="py-3 px-4 font-medium">Pelanggan</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium">Tanggal</th>
              <th className="py-3 px-4 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr
                key={o.id}
                className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--accent)]/40"
              >
                <td className="py-3 px-4">
                  <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs hover:underline">
                    {o.orderNumber}
                  </Link>
                </td>
                <td className="py-3 px-4 text-[var(--muted-foreground)] truncate max-w-[200px]">
                  {o.email ?? "—"}
                </td>
                <td className="py-3 px-4">
                  <OrderStatusBadge status={o.status} />
                </td>
                <td className="py-3 px-4 text-[var(--muted-foreground)]">
                  {new Date(o.placedAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="py-3 px-4 text-right font-medium">{formatIDR(o.grandTotal)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--muted-foreground)]">
                  Tidak ada pesanan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
