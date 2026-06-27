"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOrderStatusAction } from "@/server/actions/admin";
import { ORDER_STATUS_INFO } from "../../_lib/order-status";

const selectCls =
  "flex h-10 w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

export function StatusForm({
  orderId,
  nextStatuses,
}: {
  orderId: string;
  nextStatuses: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [to, setTo] = useState(nextStatuses[0] ?? "");
  const [courier, setCourier] = useState("");
  const [tracking, setTracking] = useState("");
  const [note, setNote] = useState("");

  function run(toStatus: string) {
    setError(null);
    startTransition(async () => {
      const res = await updateOrderStatusAction({
        orderId,
        toStatus,
        courier: toStatus === "SHIPPED" ? courier : undefined,
        trackingNumber: toStatus === "SHIPPED" ? tracking : undefined,
        note: note || undefined,
      });
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  if (nextStatuses.length === 0) {
    return (
      <p className="text-sm text-[var(--muted-foreground)]">
        Tidak ada perubahan status yang tersedia untuk pesanan ini.
      </p>
    );
  }

  const canRefund = nextStatuses.includes("REFUNDED");

  return (
    <div className="space-y-4">
      <div>
        <Label>Ubah Status Ke</Label>
        <select className={selectCls} value={to} onChange={(e) => setTo(e.target.value)}>
          {nextStatuses.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_INFO[s]?.label ?? s}
            </option>
          ))}
        </select>
      </div>

      {to === "SHIPPED" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Kurir</Label>
            <Input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="JNE" />
          </div>
          <div>
            <Label>No. Resi</Label>
            <Input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="Opsional"
            />
          </div>
        </div>
      )}

      <div>
        <Label>Catatan (opsional)</Label>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan internal" />
      </div>

      {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => run(to)} disabled={pending || !to}>
          <RefreshCw className="size-4" />
          {pending ? "Memproses..." : "Perbarui Status"}
        </Button>
        {canRefund && (
          <Button
            variant="destructive"
            onClick={() => run("REFUNDED")}
            disabled={pending}
          >
            <RotateCcw className="size-4" /> Refund (mock)
          </Button>
        )}
      </div>
    </div>
  );
}
