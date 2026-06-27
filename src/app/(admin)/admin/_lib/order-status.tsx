import { Badge } from "@/components/ui/badge";

type BadgeVariant = "default" | "secondary" | "outline" | "success" | "warning" | "destructive";

export const ORDER_STATUS_INFO: Record<string, { label: string; variant: BadgeVariant }> = {
  PENDING_PAYMENT: { label: "Menunggu Pembayaran", variant: "warning" },
  PAID: { label: "Dibayar", variant: "success" },
  PROCESSING: { label: "Diproses", variant: "default" },
  SHIPPED: { label: "Dikirim", variant: "default" },
  DELIVERED: { label: "Diterima", variant: "success" },
  CANCELLED: { label: "Dibatalkan", variant: "destructive" },
  REFUNDED: { label: "Dikembalikan", variant: "secondary" },
};

export function OrderStatusBadge({ status }: { status: string }) {
  const info = ORDER_STATUS_INFO[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}
