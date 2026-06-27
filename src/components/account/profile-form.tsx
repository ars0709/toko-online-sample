"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileAction } from "@/server/actions/account";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <form
      action={(fd) =>
        start(async () => {
          const res = await updateProfileAction(fd);
          setMsg(res.ok ? "Profil diperbarui" : res.error);
        })
      }
      className="space-y-4"
    >
      <div><Label>Nama</Label><Input name="name" defaultValue={name} required /></div>
      <div><Label>Email</Label><Input value={email} disabled /></div>
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Menyimpan..." : "Simpan"}</Button>
    </form>
  );
}
