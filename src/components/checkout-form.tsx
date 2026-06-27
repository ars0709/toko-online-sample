"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { placeOrderAction } from "@/server/actions/checkout";

type Addr = {
  id: string;
  label: string;
  recipient: string;
  line1: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Memproses..." : "Buat Pesanan & Bayar"}
    </Button>
  );
}

export function CheckoutForm({ addresses, couponCode }: { addresses: Addr[]; couponCode: string | null }) {
  const [state, action] = useActionState(placeOrderAction, undefined);
  const [mode, setMode] = useState<"saved" | "new">(addresses.length > 0 ? "saved" : "new");
  const [selectedId, setSelectedId] = useState(addresses[0]?.id ?? "");

  return (
    <form action={action} className="space-y-6">
      <div className="rounded-lg border border-[var(--border)] p-4">
        <h2 className="font-semibold mb-3">Alamat Pengiriman</h2>

        {addresses.length > 0 && (
          <div className="mb-4 flex gap-2 text-sm">
            <button type="button" onClick={() => setMode("saved")} className={`rounded-md px-3 py-1.5 border ${mode === "saved" ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]" : "border-[var(--border)]"}`}>
              Alamat Tersimpan
            </button>
            <button type="button" onClick={() => setMode("new")} className={`rounded-md px-3 py-1.5 border ${mode === "new" ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]" : "border-[var(--border)]"}`}>
              Alamat Baru
            </button>
          </div>
        )}

        {mode === "saved" ? (
          <>
            <input type="hidden" name="addressId" value={selectedId} />
            <div className="space-y-2">
              {addresses.map((a) => (
                <label key={a.id} className={`flex gap-3 rounded-md border p-3 cursor-pointer ${selectedId === a.id ? "border-[var(--primary)]" : "border-[var(--border)]"}`}>
                  <input type="radio" name="pick" checked={selectedId === a.id} onChange={() => setSelectedId(a.id)} className="mt-1" />
                  <div className="text-sm">
                    <div className="font-medium">{a.label} · {a.recipient}</div>
                    <div className="text-[var(--muted-foreground)]">{a.line1}, {a.city}, {a.province} {a.postalCode}</div>
                    <div className="text-[var(--muted-foreground)]">{a.phone}</div>
                  </div>
                </label>
              ))}
            </div>
          </>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label>Nama Penerima</Label><Input name="recipient" required /></div>
            <div><Label>No. Telepon</Label><Input name="phone" required /></div>
            <div><Label>Kode Pos</Label><Input name="postalCode" required /></div>
            <div className="sm:col-span-2"><Label>Alamat</Label><Input name="line1" required /></div>
            <div><Label>Kota</Label><Input name="city" required /></div>
            <div><Label>Provinsi</Label><Input name="province" required /></div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-[var(--border)] p-4">
        <h2 className="font-semibold mb-2">Metode Pengiriman</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" defaultChecked readOnly /> Reguler (flat-rate, gratis di atas Rp300.000)
        </label>
      </div>

      <div className="rounded-lg border border-[var(--border)] p-4">
        <h2 className="font-semibold mb-2">Pembayaran</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Setelah membuat pesanan, Anda diarahkan ke halaman pembayaran (mock gateway) untuk
          menyimulasikan pembayaran berhasil / gagal.
        </p>
      </div>

      {couponCode && <input type="hidden" name="couponCode" value={couponCode} />}
      {state?.error && <p className="text-sm text-[var(--destructive)]">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
