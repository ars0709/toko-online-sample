"use client";

import { useState, useTransition } from "react";
import { Copy, Check, KeyRound, RefreshCw, Trash2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  createKeyAction,
  revokeKeyAction,
  rollKeyAction,
} from "@/server/actions/developer";

export type KeyView = {
  id: string;
  label: string;
  environment: "TEST" | "LIVE";
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  revoked: boolean;
  createdAt: string;
};

const ALL_SCOPES = ["catalog:read", "orders:read", "orders:write", "inventory:read"];

function PlaintextBox({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
        <AlertTriangle className="size-4" />
        Simpan kunci ini sekarang — tidak akan ditampilkan lagi.
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded bg-[var(--background)] px-3 py-2 text-sm">
          {value}
        </code>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Disalin" : "Salin"}
        </Button>
      </div>
    </div>
  );
}

export function KeysManager({ keys }: { keys: KeyView[] }) {
  const [pending, startTransition] = useTransition();
  const [newKey, setNewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    setNewKey(null);
    startTransition(async () => {
      const res = await createKeyAction(formData);
      if (res.ok && res.key) setNewKey(res.key);
      else setError(res.error ?? "Gagal membuat kunci.");
    });
  }

  function handleRevoke(id: string) {
    startTransition(async () => {
      const res = await revokeKeyAction(id);
      if (!res.ok) setError(res.error ?? "Gagal mencabut kunci.");
    });
  }

  function handleRoll(id: string) {
    setError(null);
    setNewKey(null);
    startTransition(async () => {
      const res = await rollKeyAction(id);
      if (res.ok && res.key) setNewKey(res.key);
      else setError(res.error ?? "Gagal me-roll kunci.");
    });
  }

  return (
    <div className="space-y-6">
      {newKey && <PlaintextBox value={newKey} />}
      {error && (
        <div className="rounded-md border border-[var(--destructive)]/40 bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Buat kunci baru</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="label">Label</Label>
                <Input id="label" name="label" placeholder="contoh: Integrasi toko" required />
              </div>
              <div>
                <Label htmlFor="environment">Environment</Label>
                <select
                  id="environment"
                  name="environment"
                  className="flex h-10 w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm"
                  defaultValue="TEST"
                >
                  <option value="TEST">TEST</option>
                  <option value="LIVE">LIVE</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Scopes</Label>
              <div className="flex flex-wrap gap-3 pt-1">
                {ALL_SCOPES.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="scopes"
                      value={s}
                      defaultChecked={s === "catalog:read"}
                    />
                    <code>{s}</code>
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={pending}>
              <KeyRound className="size-4" /> {pending ? "Membuat..." : "Buat kunci"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kunci kamu</CardTitle>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">Belum ada kunci API.</p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {keys.map((k) => (
                <div key={k.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{k.label}</span>
                      <Badge variant={k.environment === "LIVE" ? "default" : "secondary"}>
                        {k.environment}
                      </Badge>
                      {k.revoked ? (
                        <Badge variant="destructive">Dicabut</Badge>
                      ) : (
                        <Badge variant="success">Aktif</Badge>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                      <code>{k.keyPrefix}…</code> · {k.scopes.join(", ") || "tanpa scope"}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      Terakhir dipakai: {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString("id-ID") : "belum pernah"}
                    </div>
                  </div>
                  {!k.revoked && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => handleRoll(k.id)}
                      >
                        <RefreshCw className="size-4" /> Roll
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={pending}
                        onClick={() => handleRevoke(k.id)}
                      >
                        <Trash2 className="size-4" /> Cabut
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
