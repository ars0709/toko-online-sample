"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  addAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
} from "@/server/actions/account";

type Addr = {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  line1: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
};

export function AddressManager({ addresses }: { addresses: Addr[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        {addresses.map((a) => (
          <div key={a.id} className="rounded-lg border border-[var(--border)] p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{a.label}</span>
              {a.isDefault && <Badge variant="success">Utama</Badge>}
            </div>
            <div className="mt-1 text-sm">{a.recipient} · {a.phone}</div>
            <div className="text-sm text-[var(--muted-foreground)]">{a.line1}, {a.city}, {a.province} {a.postalCode}</div>
            <div className="mt-3 flex gap-2">
              {!a.isDefault && (
                <Button variant="outline" size="sm" disabled={pending} onClick={() => start(async () => { await setDefaultAddressAction(a.id); router.refresh(); })}>
                  <Star className="size-3" /> Jadikan Utama
                </Button>
              )}
              <Button variant="ghost" size="sm" className="text-[var(--destructive)]" disabled={pending} onClick={() => start(async () => { await deleteAddressAction(a.id); router.refresh(); })}>
                <Trash2 className="size-3" /> Hapus
              </Button>
            </div>
          </div>
        ))}
      </div>

      {open ? (
        <form
          action={(fd) =>
            start(async () => {
              setErr(null);
              const res = await addAddressAction(fd);
              if (res.ok) { setOpen(false); router.refresh(); } else setErr(res.error);
            })
          }
          className="rounded-lg border border-[var(--border)] p-4 grid sm:grid-cols-2 gap-3"
        >
          <div><Label>Label</Label><Input name="label" defaultValue="Rumah" /></div>
          <div><Label>Nama Penerima</Label><Input name="recipient" required /></div>
          <div><Label>No. Telepon</Label><Input name="phone" required /></div>
          <div><Label>Kode Pos</Label><Input name="postalCode" required /></div>
          <div className="sm:col-span-2"><Label>Alamat</Label><Input name="line1" required /></div>
          <div><Label>Kota</Label><Input name="city" required /></div>
          <div><Label>Provinsi</Label><Input name="province" required /></div>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" name="isDefault" /> Jadikan alamat utama</label>
          {err && <p className="sm:col-span-2 text-sm text-[var(--destructive)]">{err}</p>}
          <div className="sm:col-span-2 flex gap-2">
            <Button type="submit" disabled={pending}>Simpan</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setOpen(true)}><Plus className="size-4" /> Tambah Alamat</Button>
      )}
    </div>
  );
}
