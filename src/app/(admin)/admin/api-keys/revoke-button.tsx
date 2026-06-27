"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { revokeApiKeyAdmin } from "@/server/actions/admin";

export function RevokeButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function revoke() {
    if (!confirm("Cabut kunci API ini? Tindakan ini tidak bisa dibatalkan.")) return;
    setError(null);
    startTransition(async () => {
      const res = await revokeApiKeyAdmin(id);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="destructive" size="sm" onClick={revoke} disabled={pending}>
        <Ban className="size-3.5" /> Cabut
      </Button>
      {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
    </div>
  );
}
